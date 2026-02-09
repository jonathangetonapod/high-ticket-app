// Instantly.ai Client - Campaign and email sequence management
// API Documentation: https://developer.instantly.ai/api/v2

const INSTANTLY_API_BASE_URL = 'https://api.instantly.ai/api/v2'

// Cache for API keys to avoid repeated Google Sheets fetches
const apiKeyCache = new Map<string, { key: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// In-flight request deduplication - share promises for concurrent requests
const inFlightRequests = new Map<string, Promise<string | null>>()

interface InstantlyCampaign {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
  // Add more fields as needed
}

interface InstantlySequenceStep {
  step_number: number
  subject: string
  body: string
  delay_in_hours: number
  variants?: Array<{
    subject: string
    body: string
  }>
}

/**
 * Get Instantly API key for a client from Google Sheets (with caching and deduplication)
 */
async function getInstantlyApiKey(clientName: string): Promise<string | null> {
  const cacheKey = clientName.toLowerCase()

  try {
    // Check cache first
    const cached = apiKeyCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✓ Using cached API key for '${clientName}'`)
      return cached.key
    }

    // Check if there's already a request in flight for this client
    const inFlight = inFlightRequests.get(cacheKey)
    if (inFlight) {
      console.log(`⏳ Waiting for in-flight API key request for '${clientName}'`)
      return await inFlight
    }

    // Create a new fetch promise
    const fetchPromise = (async () => {
      try {
        return await fetchApiKeyFromSheet(clientName)
      } finally {
        // Remove from in-flight after completion
        inFlightRequests.delete(cacheKey)
      }
    })()

    // Store the promise so other concurrent requests can reuse it
    inFlightRequests.set(cacheKey, fetchPromise)

    return await fetchPromise
  } catch (error) {
    console.error('Error fetching Instantly API key:', error)
    inFlightRequests.delete(cacheKey)
    return null
  }
}

/**
 * Internal function to fetch API key from Google Sheets
 */
async function fetchApiKeyFromSheet(clientName: string): Promise<string | null> {
  try {

    // Fetch from the same Google Sheet we use for client listing
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
    const INSTANTLY_GID = '928115249' // Instantly Workspaces tab
    const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]

    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL')
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${INSTANTLY_GID}`

    console.log(`Fetching Instantly API keys from: ${csvUrl}`)

    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
      cache: 'no-store',
      redirect: 'follow', // Explicitly follow redirects from Google Sheets
    })

    console.log(`Response status: ${response.status} ${response.statusText}`)
    console.log(`Response URL: ${response.url}`)
    console.log(`Response redirected: ${response.redirected}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to fetch sheet. Status: ${response.status}, Error: ${errorText.substring(0, 500)}`)
      console.error(`Request URL: ${csvUrl}`)
      console.error(`Final URL: ${response.url}`)
      throw new Error(`Failed to fetch sheet: ${response.statusText} (${response.status})`)
    }

    const csvText = await response.text()
    const lines = csvText.trim().split('\n')

    if (lines.length < 2) {
      throw new Error('Sheet has no data')
    }

    // Parse CSV to find matching client
    const allClients: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      // Simple CSV parsing
      // Column A: workspace_id, Column B: api_key, Column C: workspace_name, Column D: client_name
      const values: string[] = []
      let currentValue = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      values.push(currentValue.trim())

      const apiKey = values[1] || ''        // Column B: api_key
      const rowClientName = values[3] || '' // Column D: client_name

      // Skip header rows
      if (rowClientName.toLowerCase().includes('client') ||
          rowClientName.toLowerCase().includes('name')) {
        continue
      }

      // Track all clients for debugging
      if (rowClientName) {
        allClients.push(rowClientName)
      }

      // Match client name (case-insensitive, exact match)
      if (rowClientName.toLowerCase() === clientName.toLowerCase()) {
        console.log(`✓ Found API key for '${clientName}' (key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)})`)

        // Cache the API key
        apiKeyCache.set(clientName.toLowerCase(), {
          key: apiKey,
          timestamp: Date.now()
        })

        return apiKey
      }
    }

    console.error(`Client '${clientName}' not found. Available clients in Instantly sheet:`, allClients)
    throw new Error(`Client '${clientName}' not found in Instantly sheet`)

  } catch (error) {
    console.error('Error in fetchApiKeyFromSheet:', error)
    throw error
  }
}

/**
 * Make authenticated request to Instantly API
 */
async function makeInstantlyRequest<T>(
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!apiKey) {
    throw new Error('Instantly API key is required')
  }

  // Build query string
  const queryParams = new URLSearchParams(params)
  const url = `${INSTANTLY_API_BASE_URL}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Instantly API key')
      } else if (response.status === 404) {
        throw new Error('Resource not found')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      } else {
        throw new Error(`Instantly API error: ${response.statusText}`)
      }
    }

    return await response.json()

  } catch (error) {
    console.error('Error making Instantly API request:', error)
    throw error
  }
}

/**
 * List all campaigns for an Instantly client
 * Endpoint: GET /campaigns
 */
export async function listInstantlyCampaigns(options: {
  clientName: string
  status?: string // e.g., 'ACTIVE', 'PAUSED'
}): Promise<{
  success: boolean
  client_name: string
  total_campaigns: number
  campaigns: Array<{
    id: string
    name: string
    status: string
  }>
  error?: string
}> {
  try {
    const { clientName, status } = options

    console.log(`Fetching Instantly campaigns for ${clientName}...`)

    // Get API key from Google Sheet
    const apiKey = await getInstantlyApiKey(clientName)
    if (!apiKey) {
      throw new Error(`No API key found for client '${clientName}'`)
    }

    console.log(`Using API key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`)

    // Fetch campaigns with pagination
    const allCampaigns: any[] = []
    let startingAfter: string | undefined = undefined
    const maxPages = 50

    for (let page = 1; page <= maxPages; page++) {
      console.log(`Fetching campaigns page ${page}`)

      const params: Record<string, string> = {}
      if (startingAfter) params.starting_after = startingAfter
      if (status) params.status = status

      try {
        const response = await makeInstantlyRequest<{ items?: any[]; campaigns?: any[]; next_starting_after?: string }>(
          '/campaigns',
          apiKey,
          params
        )

        // Instantly API returns campaigns in 'items' array
        const campaigns = response.items || response.campaigns || []
        console.log(`Page ${page} returned ${campaigns.length} campaigns`)

        if (campaigns.length > 0) {
          console.log(`Sample campaign: ${campaigns[0].name} (ID: ${campaigns[0].id}, Status: ${campaigns[0].status})`)
        }

        if (campaigns.length === 0) {
          console.log('No campaigns found. Full response:', JSON.stringify(response, null, 2))
          break
        }

        allCampaigns.push(...campaigns)

        // Check if there's more data
        if (!response.next_starting_after) {
          break
        }

        startingAfter = response.next_starting_after
      } catch (error) {
        console.error(`Error fetching campaigns page ${page}:`, error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
        }
        break
      }
    }

    console.log(`✓ Loaded ${allCampaigns.length} campaigns`)

    // Format campaigns
    const formattedCampaigns = allCampaigns.map(c => ({
      id: c.id,
      name: c.name || 'Untitled Campaign',
      status: c.status || 'unknown'
    }))

    return {
      success: true,
      client_name: clientName,
      total_campaigns: formattedCampaigns.length,
      campaigns: formattedCampaigns,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in listInstantlyCampaigns:', errorMsg)

    return {
      success: false,
      client_name: options.clientName,
      total_campaigns: 0,
      campaigns: [],
      error: errorMsg,
    }
  }
}

// ============ Instantly Account Interfaces ============

interface InstantlyAccount {
  email: string
  warmup_status: number  // 1=Active, 0=Paused, -1=Banned, -2=Spam Unknown, -3=Permanent Suspension
  stat_warmup_score: number
  timestamp_warmup_start: string | null
  timestamp_created: string
  timestamp_last_used: string | null
  status: number  // 1=Active, 2=Paused, -1=Connection Error, -2=Soft Bounce, -3=Sending Error
  daily_limit: number
  sending_gap: number
  provider_code: number
  warmup?: {
    limit: number
    reply_rate: number
    increment: string
    warmup_custom_ftag: string
  }
  warmup_pool_id?: string
}

interface WarmupAnalyticsData {
  daysActive: number
  totalSent: number
  healthScore: number
}

/**
 * Fetch warmup analytics for emails to get ACTUAL recent activity
 */
async function fetchWarmupAnalytics(
  emails: string[],
  apiKey: string
): Promise<Map<string, WarmupAnalyticsData>> {
  const analyticsMap = new Map<string, WarmupAnalyticsData>()

  try {
    const response = await fetch(`${INSTANTLY_API_BASE_URL}/accounts/warmup-analytics`, {
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

/**
 * List email accounts with warmup stats for an Instantly client
 * Endpoint: GET /accounts + POST /accounts/warmup-analytics
 *
 * Returns email accounts with warmup statistics similar to Bison format
 */
export async function listInstantlySenderEmails(options: {
  clientName: string
}): Promise<{
  success: boolean
  client_name: string
  total_accounts: number
  accounts: Array<{
    id: string
    email: string
    name: string
    created_at?: string
    warmup_score?: number
    warmup_emails_sent?: number
    warmup_status_code: number
    warmup_status_label: string
    warmup_started?: string
    warmup_days_active?: number
    daily_limit?: number
    provider_code?: number
    provider_name?: string
    account_status_code: number
    account_status_label: string
    issues: string[]
  }>
  health_summary: {
    total: number
    healthy: number
    warning: number
    critical: number
    avg_warmup_score: number
  }
  error?: string
}> {
  const PROVIDER_NAMES: Record<number, string> = {
    1: 'Custom IMAP/SMTP',
    2: 'Google',
    3: 'Microsoft',
    4: 'AWS'
  }

  try {
    const { clientName } = options

    console.log(`Fetching Instantly sender emails for ${clientName}...`)

    // Get API key from Google Sheet
    const apiKey = await getInstantlyApiKey(clientName)
    if (!apiKey) {
      throw new Error(`No API key found for client '${clientName}'`)
    }

    // Fetch all accounts with pagination
    const allAccounts: InstantlyAccount[] = []
    let startingAfter: string | undefined = undefined
    const maxPages = 20

    for (let page = 1; page <= maxPages; page++) {
      const params: Record<string, string> = { limit: '100' }
      if (startingAfter) params.starting_after = startingAfter

      try {
        const response = await makeInstantlyRequest<{
          items?: InstantlyAccount[]
          next_starting_after?: string
        }>('/accounts', apiKey, params)

        const accounts = response.items || []
        console.log(`Page ${page}: ${accounts.length} accounts`)

        if (accounts.length === 0) break

        allAccounts.push(...accounts)

        if (!response.next_starting_after) break
        startingAfter = response.next_starting_after
      } catch (error) {
        console.warn(`Error fetching accounts page ${page}:`, error)
        break
      }
    }

    console.log(`Fetched ${allAccounts.length} total accounts`)

    if (allAccounts.length === 0) {
      return {
        success: true,
        client_name: clientName,
        total_accounts: 0,
        accounts: [],
        health_summary: {
          total: 0,
          healthy: 0,
          warning: 0,
          critical: 0,
          avg_warmup_score: 0
        }
      }
    }

    // Fetch warmup analytics to get REAL recent activity data
    const emails = allAccounts.map(acc => acc.email)
    const analytics = await fetchWarmupAnalytics(emails, apiKey)

    // Process accounts and calculate health status
    let healthy = 0
    let warning = 0
    let critical = 0
    let totalWarmupScore = 0

    const processedAccounts = allAccounts.map((acc) => {
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

      const score = acc.stat_warmup_score || 0
      totalWarmupScore += score

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
      // ========================================
      if (!warmupNotEnabled && acc.warmup_status >= 0 && acc.status >= 0) {
        if (daysActive === 0 && totalSent === 0) {
          if (status !== 'critical') status = 'critical'
          issues.push('⏳ WARMUP NOT COMPLETED - No recent activity')
        } else if (daysSinceStart >= 14 && daysActive < 5) {
          if (status !== 'critical') status = 'warning'
          issues.push(`⏳ WARMUP NOT COMPLETED - Restarted ${daysActive} days ago`)
        } else if (daysSinceStart > 0 && daysSinceStart < 14) {
          if (daysSinceStart < 7) {
            if (status !== 'critical') status = 'critical'
          } else {
            if (status !== 'critical') status = 'warning'
          }
          issues.push(`⏳ WARMUP NOT COMPLETED - ${daysSinceStart} days, ${totalSent} emails`)
        }
      }

      // ========================================
      // PRIORITY 6: Score and Health Checks
      // ========================================
      if (score > 0 && score < 30) {
        if (status !== 'critical') status = 'critical'
        issues.push(`📉 Very low warmup score: ${score}%`)
      } else if (score > 0 && score < 50 && status === 'healthy') {
        status = 'warning'
        issues.push(`📊 Low warmup score: ${score}%`)
      }

      if (healthScore > 0 && healthScore < 70 && status === 'healthy') {
        status = 'warning'
        issues.push(`📬 Inbox rate: ${healthScore}%`)
      }

      // Update counters
      if (status === 'healthy') healthy++
      else if (status === 'warning') warning++
      else critical++

      // Get warmup status label
      let warmupStatusLabel = 'Unknown'
      if (acc.warmup_status === 1) warmupStatusLabel = 'Active'
      else if (acc.warmup_status === 0) warmupStatusLabel = 'Paused'
      else if (acc.warmup_status === -1) warmupStatusLabel = 'Banned'
      else if (acc.warmup_status === -2) warmupStatusLabel = 'Spam Issue'
      else if (acc.warmup_status === -3) warmupStatusLabel = 'Suspended'

      // Get account status label
      let accountStatusLabel = 'Unknown'
      if (acc.status === 1) accountStatusLabel = 'Active'
      else if (acc.status === 2) accountStatusLabel = 'Paused'
      else if (acc.status === -1) accountStatusLabel = 'Connection Error'
      else if (acc.status === -2) accountStatusLabel = 'Bounce Error'
      else if (acc.status === -3) accountStatusLabel = 'Sending Error'

      return {
        id: acc.email, // Use email as ID for Instantly
        email: acc.email,
        name: acc.email.split('@')[0], // Use first part of email as name
        created_at: acc.timestamp_created,
        warmup_score: score,
        warmup_emails_sent: totalSent,
        warmup_status_code: acc.warmup_status,
        warmup_status_label: warmupStatusLabel,
        warmup_started: acc.timestamp_warmup_start || undefined,
        warmup_days_active: daysActive,
        daily_limit: acc.daily_limit,
        provider_code: acc.provider_code,
        provider_name: PROVIDER_NAMES[acc.provider_code] || 'Unknown',
        account_status_code: acc.status,
        account_status_label: accountStatusLabel,
        issues,
        _health_status: status // Internal field for determining health
      }
    })

    const avgWarmupScore = allAccounts.length > 0 ? totalWarmupScore / allAccounts.length : 0

    console.log(`✓ Loaded ${allAccounts.length} sender accounts (${healthy} healthy, ${warning} warning, ${critical} critical)`)

    return {
      success: true,
      client_name: clientName,
      total_accounts: allAccounts.length,
      accounts: processedAccounts,
      health_summary: {
        total: allAccounts.length,
        healthy,
        warning,
        critical,
        avg_warmup_score: Math.round(avgWarmupScore)
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in listInstantlySenderEmails:', errorMsg)

    return {
      success: false,
      client_name: options.clientName,
      total_accounts: 0,
      accounts: [],
      health_summary: {
        total: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
        avg_warmup_score: 0
      },
      error: errorMsg
    }
  }
}

/**
 * Get detailed campaign information including email sequences
 * Endpoint: GET /campaigns/{campaign_id}
 */
export async function getInstantlyCampaignDetails(options: {
  clientName: string
  campaignId: string
}): Promise<{
  success: boolean
  campaign_id: string
  campaign_name: string
  platform: string
  sequences: Array<{
    step: number
    subject: string
    body: string
    delay_hours: number
    variants?: Array<{ subject: string; body: string }>
  }>
  error?: string
}> {
  try {
    const { clientName, campaignId } = options

    console.log(`Fetching Instantly campaign details for ${campaignId}...`)

    // Get API key from Google Sheet
    const apiKey = await getInstantlyApiKey(clientName)
    if (!apiKey) {
      throw new Error(`No API key found for client '${clientName}'`)
    }

    // Fetch campaign details
    const campaign = await makeInstantlyRequest<any>(
      `/campaigns/${campaignId}`,
      apiKey
    )

    // Extract sequences from Instantly API structure
    // Instantly returns: { sequences: [{ steps: [{ variants: [{ subject, body }] }] }] }
    console.log(`Campaign structure:`, {
      has_sequences: !!campaign.sequences,
      sequences_length: campaign.sequences?.length,
      first_sequence_has_steps: !!campaign.sequences?.[0]?.steps,
      steps_count: campaign.sequences?.[0]?.steps?.length
    })

    const rawSequences = campaign.sequences?.[0]?.steps || []

    const sequences = rawSequences.map((step: any, index: number) => {
      // Get the first variant for the main subject/body, or use empty strings
      const firstVariant = step.variants?.[0] || {}

      return {
        step: index + 1,
        subject: firstVariant.subject || step.subject || '',
        body: firstVariant.body || step.body || '',
        delay_hours: step.delay || 0,
        variants: step.variants || []
      }
    })

    console.log(`✓ Loaded campaign with ${sequences.length} sequences`)
    if (sequences.length > 0) {
      console.log(`First sequence sample:`, {
        step: sequences[0].step,
        has_subject: !!sequences[0].subject,
        has_body: !!sequences[0].body,
        subject_preview: sequences[0].subject?.substring(0, 50)
      })
    }

    return {
      success: true,
      campaign_id: campaignId,
      campaign_name: campaign.name || 'Untitled Campaign',
      platform: 'instantly',
      sequences,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getInstantlyCampaignDetails:', errorMsg)

    return {
      success: false,
      campaign_id: options.campaignId,
      campaign_name: '',
      platform: 'instantly',
      sequences: [],
      error: errorMsg,
    }
  }
}
