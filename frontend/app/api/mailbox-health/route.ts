import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/session'

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'
const BISON_API_BASE = 'https://send.leadgenjay.com/api'

// Google Sheets config
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
const INSTANTLY_GID = '928115249'
const BISON_GID = '1631680229'

// ============ CACHING ============
interface CacheEntry<T> {
  data: T
  timestamp: number
}

// In-memory cache for mailbox health (60 second TTL)
let mailboxHealthCache: CacheEntry<{
  summary: any
  mailboxes: MailboxHealth[]
}> | null = null
const CACHE_TTL = 60 * 1000 // 60 seconds

// Credentials cache (5 minute TTL)
let credentialsCache: CacheEntry<{
  instantly: ClientCredentials[]
  bison: ClientCredentials[]
}> | null = null
const CREDENTIALS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// In-flight request deduplication
let inFlightRequest: Promise<any> | null = null

interface ClientCredentials {
  name: string
  platform: 'instantly' | 'bison'
  apiKey: string
  workspaceId?: string
}

interface WarmupSettings {
  limit?: number
  replyRate?: number
  increment?: string
  warmupPoolId?: string
  customTag?: string
}

interface MailboxHealth {
  email: string
  clientName: string
  platform: 'instantly' | 'bison'
  status: 'healthy' | 'warning' | 'critical'
  warmupScore?: number
  warmupStatus?: string
  warmupSettings?: WarmupSettings
  dailyLimit?: number
  sendingGap?: number
  createdAt?: string
  lastUsed?: string
  warmupStarted?: string
  providerCode?: number
  providerName?: string
  issues: string[]
  // Bison-specific fields
  bisonId?: number  // Needed for delete
  warmupEnabled?: boolean
  warmupEmailsSent?: number
  warmupRepliesReceived?: number
  warmupSavedFromSpam?: number
  warmupBouncesCaused?: number
  warmupBouncesReceived?: number
  warmupDisabledCount?: number
  warmupDailyLimit?: number
}

// Fetch credentials from Google Sheets (with caching)
async function fetchAllCredentials(): Promise<{
  instantly: ClientCredentials[]
  bison: ClientCredentials[]
}> {
  // Check cache first
  if (credentialsCache && Date.now() - credentialsCache.timestamp < CREDENTIALS_CACHE_TTL) {
    console.log('✓ Using cached credentials')
    return credentialsCache.data
  }

  console.log('Fetching fresh credentials from Google Sheets...')
  
  const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  if (!spreadsheetId) return { instantly: [], bison: [] }

  const fetchSheet = async (gid: string, platform: 'instantly' | 'bison'): Promise<ClientCredentials[]> => {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
    
    try {
      const response = await fetch(csvUrl, { cache: 'no-store' })
      if (!response.ok) return []
      
      const text = await response.text()
      const lines = text.trim().split('\n')
      const credentials: ClientCredentials[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue
        
        const values: string[] = []
        let current = ''
        let inQuotes = false
        
        for (const char of line) {
          if (char === '"') inQuotes = !inQuotes
          else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else current += char
        }
        values.push(current.trim())
        
        if (platform === 'instantly') {
          if (values[0] && values[1] && values[3]) {
            credentials.push({
              workspaceId: values[0],
              apiKey: values[1],
              name: values[3],
              platform: 'instantly'
            })
          }
        } else {
          if (values[0] && values[1] && !values[0].toLowerCase().includes('client')) {
            credentials.push({
              name: values[0],
              apiKey: values[1],
              platform: 'bison'
            })
          }
        }
      }
      
      return credentials
    } catch (error) {
      console.error(`Error fetching ${platform} credentials:`, error)
      return []
    }
  }

  // Fetch both sheets in parallel
  const [instantly, bison] = await Promise.all([
    fetchSheet(INSTANTLY_GID, 'instantly'),
    fetchSheet(BISON_GID, 'bison')
  ])

  // Cache the result
  credentialsCache = {
    data: { instantly, bison },
    timestamp: Date.now()
  }

  console.log(`✓ Cached ${instantly.length} Instantly, ${bison.length} Bison credentials`)
  return { instantly, bison }
}

// Provider code to name mapping
const PROVIDER_NAMES: Record<number, string> = {
  1: 'Custom IMAP/SMTP',
  2: 'Google',
  3: 'Microsoft',
  4: 'AWS'
}

// Fetch warmup analytics for emails (to get ACTUAL recent activity)
async function fetchWarmupAnalytics(emails: string[], apiKey: string): Promise<Map<string, { daysActive: number; totalSent: number; healthScore: number }>> {
  const analyticsMap = new Map<string, { daysActive: number; totalSent: number; healthScore: number }>()
  
  try {
    const response = await fetch(`${INSTANTLY_API_BASE}/accounts/warmup-analytics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emails: emails.slice(0, 100) }), // API limit
      cache: 'no-store'
    })
    
    if (!response.ok) return analyticsMap
    
    const data = await response.json()
    const emailDateData = data.email_date_data || {}
    const aggregateData = data.aggregate_data || {}
    
    for (const email of emails) {
      const dateData = emailDateData[email] || {}
      const aggregate = aggregateData[email] || { sent: 0, health_score: 0 }
      const daysActive = Object.keys(dateData).length
      
      analyticsMap.set(email, {
        daysActive,
        totalSent: aggregate.sent || 0,
        healthScore: aggregate.health_score || 0
      })
    }
  } catch (error) {
    console.error('Error fetching warmup analytics:', error)
  }
  
  return analyticsMap
}

// Fetch Instantly accounts for a workspace (with timeout)
async function fetchInstantlyAccounts(apiKey: string, clientName: string): Promise<MailboxHealth[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout (includes analytics)

  try {
    // First, fetch accounts
    const response = await fetch(`${INSTANTLY_API_BASE}/accounts?limit=100`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store',
      signal: controller.signal
    })
    
    if (!response.ok) {
      clearTimeout(timeout)
      return []
    }
    
    const data = await response.json()
    const accounts = data.items || []
    
    if (accounts.length === 0) {
      clearTimeout(timeout)
      return []
    }
    
    // Fetch warmup analytics to get REAL recent activity data
    const emails = accounts.map((acc: any) => acc.email)
    const analytics = await fetchWarmupAnalytics(emails, apiKey)
    
    clearTimeout(timeout)
    
    return accounts.map((acc: any) => {
      const issues: string[] = []
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      // Get REAL activity data from analytics
      const analyticsData = analytics.get(acc.email)
      const daysActive = analyticsData?.daysActive ?? 0
      const totalSent = analyticsData?.totalSent ?? 0
      const healthScore = analyticsData?.healthScore ?? 0
      
      // Calculate days since warmup first started
      let daysSinceStart = 0
      if (acc.timestamp_warmup_start) {
        daysSinceStart = Math.floor((Date.now() - new Date(acc.timestamp_warmup_start).getTime()) / (1000 * 60 * 60 * 24))
      }
      
      // ========================================
      // PRIORITY 1: Connection/Account Errors (Critical)
      // ========================================
      if (acc.status === -1) {
        status = 'critical'
        issues.push('🔌 Connection Error')
      } else if (acc.status === -2) {
        status = 'critical'
        issues.push('📧 Soft Bounce Error')
      } else if (acc.status === -3) {
        status = 'critical'
        issues.push('🚫 Sending Error')
      }
      
      // ========================================
      // PRIORITY 2: Warmup Status Errors (Critical)
      // ========================================
      if (acc.warmup_status === -1) {
        status = 'critical'
        issues.push('🚫 Banned from warmup pool')
      } else if (acc.warmup_status === -2) {
        status = 'critical'
        issues.push('📁 Spam folder issue')
      } else if (acc.warmup_status === -3) {
        status = 'critical'
        issues.push('⛔ Permanently suspended')
      }
      
      // ========================================
      // PRIORITY 3: Warmup Not Enabled
      // ========================================
      const warmupNotEnabled = acc.warmup_status === 0 || 
        (totalSent === 0 && daysActive === 0 && !acc.timestamp_warmup_start)
      
      if (warmupNotEnabled && status !== 'critical') {
        status = 'critical'
        issues.push('⚠️ WARMUP NOT ENABLED')
      }
      
      // ========================================
      // PRIORITY 4: Account Paused (Warning)
      // ========================================
      if (acc.status === 2 && !issues.some(i => i.includes('WARMUP NOT ENABLED'))) {
        if (status !== 'critical') status = 'warning'
        issues.push('⏸️ Account paused')
      }
      
      // ========================================
      // PRIORITY 5: Warmup Completion Check
      // Only for accounts with warmup enabled and no critical errors
      // ========================================
      if (!warmupNotEnabled && acc.warmup_status >= 0 && acc.status >= 0) {
        // No recent activity at all
        if (daysActive === 0 && totalSent === 0) {
          if (status !== 'critical') status = 'critical'
          issues.push('⏳ WARMUP NOT COMPLETED - No recent activity')
        }
        // Started 14+ days ago but sparse recent activity (paused and resumed)
        else if (daysSinceStart >= 14 && daysActive < 5) {
          if (status !== 'critical') status = 'warning'
          issues.push(`⏳ WARMUP NOT COMPLETED - Restarted ${daysActive} days ago`)
        }
        // Brand new account (< 14 days since start)
        else if (daysSinceStart > 0 && daysSinceStart < 14) {
          if (daysSinceStart < 7) {
            if (status !== 'critical') status = 'critical'
          } else {
            if (status !== 'critical') status = 'warning'
          }
          issues.push(`⏳ WARMUP NOT COMPLETED - ${daysSinceStart} days, ${totalSent} emails`)
        }
        // Ready: 14+ days since start AND 5+ days recent activity
      }
      
      // ========================================
      // PRIORITY 6: Score and Health Checks
      // Only flag if not already critical from above
      // ========================================
      const score = acc.stat_warmup_score || 0
      
      // Very low score is always critical
      if (score > 0 && score < 30) {
        if (status !== 'critical') status = 'critical'
        issues.push(`📉 Very low warmup score: ${score}%`)
      }
      // Low score is warning
      else if (score > 0 && score < 50 && status === 'healthy') {
        status = 'warning'
        issues.push(`📊 Low warmup score: ${score}%`)
      }
      
      // Check inbox rate from analytics (if we have data)
      if (healthScore > 0 && healthScore < 70 && status === 'healthy') {
        status = 'warning'
        issues.push(`📬 Inbox rate: ${healthScore}%`)
      }

      const warmupSettings: WarmupSettings = {}
      if (acc.warmup) {
        warmupSettings.limit = acc.warmup.limit
        warmupSettings.replyRate = acc.warmup.reply_rate
        warmupSettings.increment = acc.warmup.increment
        warmupSettings.customTag = acc.warmup.warmup_custom_ftag
      }
      if (acc.warmup_pool_id) {
        warmupSettings.warmupPoolId = acc.warmup_pool_id
      }
      
      return {
        email: acc.email,
        clientName,
        platform: 'instantly' as const,
        status,
        warmupScore: score,
        warmupStatus: acc.warmup_status === 1 ? 'Active' : acc.warmup_status === 0 ? 'Paused' : 'Error',
        warmupSettings: Object.keys(warmupSettings).length > 0 ? warmupSettings : undefined,
        dailyLimit: acc.daily_limit,
        sendingGap: acc.sending_gap,
        createdAt: acc.timestamp_created,
        lastUsed: acc.timestamp_last_used,
        warmupStarted: acc.timestamp_warmup_start,
        providerCode: acc.provider_code,
        providerName: PROVIDER_NAMES[acc.provider_code] || 'Unknown',
        issues
      }
    })
  } catch (error: any) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      console.warn(`Timeout fetching Instantly accounts for ${clientName}`)
    } else {
      console.error(`Error fetching Instantly accounts for ${clientName}:`, error)
    }
    return []
  }
}

// Fetch Bison accounts for a client (with full warmup details)
// Uses warmup_status filter to get accurate enabled/disabled status
async function fetchBisonAccounts(apiKey: string, clientName: string): Promise<MailboxHealth[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Fetch BOTH enabled and disabled accounts in parallel
    // The warmup_status filter makes the API return warmup_enabled field
    const [enabledResponse, disabledResponse] = await Promise.all([
      fetch(
        `${BISON_API_BASE}/warmup/sender-emails?start_date=${start}&end_date=${end}&warmup_status=enabled&page=1`,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          cache: 'no-store',
          signal: controller.signal
        }
      ),
      fetch(
        `${BISON_API_BASE}/warmup/sender-emails?start_date=${start}&end_date=${end}&warmup_status=disabled&page=1`,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          cache: 'no-store',
          signal: controller.signal
        }
      )
    ])
    
    clearTimeout(timeout)
    
    const enabledData = enabledResponse.ok ? await enabledResponse.json() : { data: [] }
    const disabledData = disabledResponse.ok ? await disabledResponse.json() : { data: [] }
    
    // Combine both lists
    const accounts = [
      ...(enabledData.data || []),
      ...(disabledData.data || [])
    ]
    
    if (accounts.length === 0) return []
    
    return accounts.map((acc: any) => {
      const issues: string[] = []
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      const score = acc.warmup_score || 0
      const emailsSent = acc.warmup_emails_sent || 0
      const bouncesCaused = acc.warmup_bounces_caused_count || 0
      const bouncesReceived = acc.warmup_bounces_received_count || 0
      const repliesReceived = acc.warmup_replies_received || 0
      const savedFromSpam = acc.warmup_emails_saved_from_spam || 0
      const bounceRate = emailsSent > 0 ? (bouncesCaused / emailsSent) * 100 : 0
      const disabledForBouncing = (acc.warmup_disabled_for_bouncing_count || 0) > 0
      
      // warmup_enabled comes directly from the API when using warmup_status filter
      const warmupEnabled = acc.warmup_enabled === true
      
      // Estimate warmup age from emails sent (~10-15/day average, use 12)
      let warmupAgeDays: number | null = null
      if (emailsSent > 0) {
        warmupAgeDays = Math.ceil(emailsSent / 12)
      }
      
      // Calculate reply rate (healthy warmup has ~25-40% reply rate)
      const replyRate = emailsSent > 0 ? (repliesReceived / emailsSent) * 100 : 0
      
      // ========================================
      // PRIORITY 1: Disabled for Bouncing (Critical)
      // Account was auto-disabled due to high bounce rate
      // ========================================
      if (disabledForBouncing) {
        status = 'critical'
        issues.push('🚫 Disabled for bouncing')
      }
      
      // ========================================
      // PRIORITY 2: Warmup Not Enabled (Critical)
      // ========================================
      if (!warmupEnabled) {
        status = 'critical'
        issues.push('⚠️ WARMUP NOT ENABLED')
      }
      
      // ========================================
      // PRIORITY 3: Warmup Completion Check
      // Only for enabled accounts not disabled for bouncing
      // ========================================
      if (warmupEnabled && !disabledForBouncing) {
        if (emailsSent === 0) {
          // Just enabled, no emails sent yet
          status = 'critical'
          issues.push('⏳ WARMUP NOT COMPLETED - Just started')
        } else if (warmupAgeDays !== null && warmupAgeDays < 14) {
          // Less than 14 days of warmup
          if (warmupAgeDays < 7) {
            if (status !== 'critical') status = 'critical'
          } else {
            if (status !== 'critical') status = 'warning'
          }
          issues.push(`⏳ WARMUP NOT COMPLETED - ${warmupAgeDays} days, ${emailsSent} emails`)
        }
        // 14+ days = passed warmup completion check
      }
      
      // ========================================
      // PRIORITY 4: Score Checks
      // Only for accounts that passed above checks
      // ========================================
      if (warmupEnabled && !disabledForBouncing && (warmupAgeDays === null || warmupAgeDays >= 14)) {
        if (score > 0 && score < 30) {
          if (status !== 'critical') status = 'critical'
          issues.push(`📉 Very low warmup score: ${score}%`)
        } else if (score > 0 && score < 50 && status === 'healthy') {
          status = 'warning'
          issues.push(`📊 Low warmup score: ${score}%`)
        }
      }
      
      // ========================================
      // PRIORITY 5: Bounce Rate Checks
      // Only for accounts that passed above checks
      // ========================================
      if (warmupEnabled && !disabledForBouncing && (warmupAgeDays === null || warmupAgeDays >= 14)) {
        if (bounceRate > 5) {
          if (status !== 'critical') status = 'critical'
          issues.push(`💥 High bounce rate: ${bounceRate.toFixed(1)}%`)
        } else if (bounceRate > 2 && status === 'healthy') {
          status = 'warning'
          issues.push(`⚡ Elevated bounce rate: ${bounceRate.toFixed(1)}%`)
        }
      }
      
      // ========================================
      // PRIORITY 6: Low Reply Rate Warning
      // Healthy warmup should have 20%+ reply rate
      // ========================================
      if (warmupEnabled && emailsSent >= 100 && replyRate < 15 && status === 'healthy') {
        status = 'warning'
        issues.push(`💬 Low reply rate: ${replyRate.toFixed(1)}%`)
      }

      return {
        email: acc.email,
        clientName,
        platform: 'bison' as const,
        status,
        warmupScore: score,
        warmupStatus: !warmupEnabled ? 'Disabled' : emailsSent >= 500 ? 'Active' : 'Warming',
        bisonId: acc.id,
        warmupEnabled,
        warmupEmailsSent: emailsSent,
        warmupRepliesReceived: acc.warmup_replies_received || 0,
        warmupSavedFromSpam: acc.warmup_emails_saved_from_spam || 0,
        warmupBouncesCaused: bouncesCaused,
        warmupBouncesReceived: acc.warmup_bounces_received_count || 0,
        warmupDisabledCount: acc.warmup_disabled_for_bouncing_count || 0,
        warmupDailyLimit: acc.warmup_daily_limit,
        issues
      }
    })
  } catch (error: any) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      console.warn(`Timeout fetching Bison accounts for ${clientName}`)
    } else {
      console.error(`Error fetching Bison accounts for ${clientName}:`, error)
    }
    return []
  }
}

// Main data fetcher (with request deduplication)
async function fetchMailboxHealthData(): Promise<{
  summary: any
  mailboxes: MailboxHealth[]
}> {
  const startTime = Date.now()
  
  // Get credentials (cached)
  const { instantly: instantlyClients, bison: bisonClients } = await fetchAllCredentials()
  
  console.log(`Fetching mailboxes for ${instantlyClients.length} Instantly + ${bisonClients.length} Bison clients...`)
  
  const allMailboxes: MailboxHealth[] = []
  
  // Process ALL clients in parallel (increased from 5 to 15)
  const chunkSize = 15
  
  // Process Instantly clients
  for (let i = 0; i < instantlyClients.length; i += chunkSize) {
    const chunk = instantlyClients.slice(i, i + chunkSize)
    const results = await Promise.all(
      chunk.map(client => fetchInstantlyAccounts(client.apiKey, client.name))
    )
    results.forEach(accounts => allMailboxes.push(...accounts))
  }
  
  // Process Bison clients
  for (let i = 0; i < bisonClients.length; i += chunkSize) {
    const chunk = bisonClients.slice(i, i + chunkSize)
    const results = await Promise.all(
      chunk.map(client => fetchBisonAccounts(client.apiKey, client.name))
    )
    results.forEach(accounts => allMailboxes.push(...accounts))
  }
  
  const elapsed = Date.now() - startTime
  console.log(`✓ Fetched ${allMailboxes.length} mailboxes in ${elapsed}ms`)
  
  const summary = {
    total: allMailboxes.length,
    healthy: allMailboxes.filter(m => m.status === 'healthy').length,
    warning: allMailboxes.filter(m => m.status === 'warning').length,
    critical: allMailboxes.filter(m => m.status === 'critical').length,
    instantly: allMailboxes.filter(m => m.platform === 'instantly').length,
    bison: allMailboxes.filter(m => m.platform === 'bison').length,
    clientCount: new Set(allMailboxes.map(m => m.clientName)).size
  }
  
  return { summary, mailboxes: allMailboxes }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    // await requireAuth() // TODO: re-enable

    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'

    // Check cache first (unless force refresh)
    if (!forceRefresh && mailboxHealthCache && Date.now() - mailboxHealthCache.timestamp < CACHE_TTL) {
      console.log('✓ Returning cached mailbox health data')
      return NextResponse.json({
        success: true,
        cached: true,
        cacheAge: Math.round((Date.now() - mailboxHealthCache.timestamp) / 1000),
        ...mailboxHealthCache.data
      })
    }

    // Deduplicate in-flight requests
    if (inFlightRequest) {
      console.log('⏳ Waiting for in-flight request...')
      const result = await inFlightRequest
      return NextResponse.json({ success: true, ...result })
    }

    // Start new fetch
    inFlightRequest = fetchMailboxHealthData()
    
    try {
      const result = await inFlightRequest
      
      // Cache the result
      mailboxHealthCache = {
        data: result,
        timestamp: Date.now()
      }
      
      return NextResponse.json({
        success: true,
        cached: false,
        ...result
      })
    } finally {
      inFlightRequest = null
    }
    
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching mailbox health:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mailbox health' },
      { status: 500 }
    )
  }
}
