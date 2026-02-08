import { NextRequest, NextResponse } from 'next/server'

const BISON_API_BASE = 'https://send.leadgenjay.com/api'

// Google Sheets config for API keys
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
const BISON_GID = '1631680229'

interface BisonWarmupAccount {
  id: number
  email: string
  name: string
  domain: string
  tags: any[]
  warmup_emails_sent: number
  warmup_replies_received: number
  warmup_emails_saved_from_spam: number
  warmup_score: number
  warmup_bounces_received_count: number
  warmup_bounces_caused_count: number
  warmup_disabled_for_bouncing_count: number
}

interface BisonSenderEmail {
  id: number
  email: string
  created_at: string
  warmup_enabled: boolean
  warmup_started_at: string | null
  daily_limit: number
  warmup_daily_limit: number
}

// Fetch API key for a client from Google Sheets
async function getApiKey(clientName: string): Promise<string | null> {
  const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  if (!spreadsheetId) return null

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${BISON_GID}`
  
  try {
    const response = await fetch(csvUrl, { cache: 'no-store' })
    if (!response.ok) return null
    
    const text = await response.text()
    const lines = text.trim().split('\n')
    
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
      
      // Bison: client_name (col 0), api_key (col 1)
      const rowClientName = values[0] || ''
      const apiKey = values[1] || ''
      
      if (rowClientName.toLowerCase() === clientName.toLowerCase()) {
        return apiKey
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching API key:', error)
    return null
  }
}

// Fetch warmup stats from Bison API
async function fetchBisonWarmupStats(apiKey: string): Promise<BisonWarmupAccount[]> {
  try {
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const allAccounts: BisonWarmupAccount[] = []
    let page = 1
    const maxPages = 20
    
    while (page <= maxPages) {
      const response = await fetch(
        `${BISON_API_BASE}/warmup/sender-emails?start_date=${start}&end_date=${end}&page=${page}`,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          cache: 'no-store'
        }
      )
      
      if (!response.ok) break
      
      const data = await response.json()
      const accounts = data.data || []
      
      if (accounts.length === 0) break
      
      allAccounts.push(...accounts)
      
      if (accounts.length < 15) break
      page++
    }
    
    return allAccounts
  } catch (error) {
    console.error('Error fetching Bison warmup stats:', error)
    return []
  }
}

// Fetch sender email details (for warmup_started_at)
async function fetchSenderEmailDetails(apiKey: string): Promise<Map<string, BisonSenderEmail>> {
  const detailsMap = new Map<string, BisonSenderEmail>()
  
  try {
    let page = 1
    const maxPages = 20
    
    while (page <= maxPages) {
      const response = await fetch(
        `${BISON_API_BASE}/sender-emails?page=${page}`,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          cache: 'no-store'
        }
      )
      
      if (!response.ok) break
      
      const data = await response.json()
      const emails = data.data || []
      
      if (emails.length === 0) break
      
      for (const email of emails) {
        detailsMap.set(email.email, email)
      }
      
      if (emails.length < 15) break
      page++
    }
  } catch (error) {
    console.error('Error fetching sender email details:', error)
  }
  
  return detailsMap
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName } = body

    if (!clientName) {
      return NextResponse.json(
        { success: false, error: 'clientName required' },
        { status: 400 }
      )
    }

    // Get API key for client
    const apiKey = await getApiKey(clientName)
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: `No API key found for client: ${clientName}` },
        { status: 404 }
      )
    }

    // Fetch warmup stats and sender details in parallel
    const [accounts, senderDetails] = await Promise.all([
      fetchBisonWarmupStats(apiKey),
      fetchSenderEmailDetails(apiKey)
    ])

    // Process and categorize
    const processedAccounts = accounts.map(acc => {
      const details = senderDetails.get(acc.email)
      const issues: string[] = []
      let status: 'healthy' | 'warning' | 'critical' | 'inactive' = 'healthy'
      
      // Calculate warmup age
      let warmupStartDate: string | null = null
      let warmupAgeDays: number | null = null
      let createdAt: string | null = null
      
      if (details?.warmup_started_at) {
        warmupStartDate = details.warmup_started_at.split('T')[0]
        warmupAgeDays = Math.floor((Date.now() - new Date(details.warmup_started_at).getTime()) / (1000 * 60 * 60 * 24))
      } else if (details?.created_at) {
        // Use created_at as fallback
        createdAt = details.created_at.split('T')[0]
        warmupAgeDays = Math.floor((Date.now() - new Date(details.created_at).getTime()) / (1000 * 60 * 60 * 24))
      } else if (acc.warmup_emails_sent > 0) {
        // Estimate based on emails sent (avg 10-15 per day)
        warmupAgeDays = Math.ceil(acc.warmup_emails_sent / 12)
      }

      // Daily averages (estimated from 30-day period)
      const dailyAvgSent = Math.round(acc.warmup_emails_sent / 30)
      const replyRate = acc.warmup_emails_sent > 0 
        ? Math.round((acc.warmup_replies_received / acc.warmup_emails_sent) * 100)
        : 0

      // Is warmup enabled?
      const warmupEnabled = details?.warmup_enabled ?? (acc.warmup_emails_sent > 0)

      // Readiness (14+ days, score 70+)
      const isReady = (warmupAgeDays || 0) >= 14 && acc.warmup_score >= 70 && warmupEnabled
      const daysUntilReady = isReady ? null : Math.max(0, 14 - (warmupAgeDays || 0))
      
      // Status determination
      if (!warmupEnabled || acc.warmup_emails_sent === 0) {
        status = 'inactive'
        issues.push('Warmup not active')
      } else if (acc.warmup_disabled_for_bouncing_count > 0) {
        status = 'critical'
        issues.push('Disabled for bouncing')
      } else if ((warmupAgeDays || 0) < 7) {
        status = 'critical'
        issues.push(`Only ${warmupAgeDays || 0} days old`)
      } else if ((warmupAgeDays || 0) < 14) {
        status = 'warning'
        issues.push(`${warmupAgeDays} days (need 14+)`)
      }
      
      if (acc.warmup_score < 30) {
        status = 'critical'
        issues.push(`Score: ${acc.warmup_score}`)
      } else if (acc.warmup_score < 50) {
        if (status === 'healthy') status = 'warning'
        issues.push(`Score: ${acc.warmup_score}`)
      }
      
      if (acc.warmup_bounces_caused_count > 5) {
        status = 'critical'
        issues.push(`${acc.warmup_bounces_caused_count} bounces`)
      } else if (acc.warmup_bounces_caused_count > 2) {
        if (status === 'healthy') status = 'warning'
        issues.push(`${acc.warmup_bounces_caused_count} bounces`)
      }
      
      return {
        id: acc.id,
        email: acc.email,
        domain: acc.domain,
        warmup_enabled: warmupEnabled,
        warmup_score: acc.warmup_score,
        warmup_emails_sent: acc.warmup_emails_sent,
        warmup_replies_received: acc.warmup_replies_received,
        warmup_emails_saved_from_spam: acc.warmup_emails_saved_from_spam,
        warmup_bounces_caused_count: acc.warmup_bounces_caused_count,
        warmup_bounces_received_count: acc.warmup_bounces_received_count,
        warmup_disabled_count: acc.warmup_disabled_for_bouncing_count,
        warmup_daily_limit: details?.warmup_daily_limit || null,
        daily_limit: details?.daily_limit || null,
        warmup_start_date: warmupStartDate,
        warmup_age_days: warmupAgeDays,
        created_at: createdAt,
        daily_avg_sent: dailyAvgSent,
        reply_rate: replyRate,
        ready_to_send: isReady,
        days_until_ready: daysUntilReady,
        status,
        issues
      }
    })

    // Sort: problems first, then by score
    processedAccounts.sort((a, b) => {
      const statusOrder = { critical: 0, warning: 1, inactive: 2, healthy: 3 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return a.warmup_score - b.warmup_score
    })

    // Summary stats
    const activeAccounts = processedAccounts.filter(a => a.warmup_enabled)
    const summary = {
      totalAccounts: processedAccounts.length,
      healthy: processedAccounts.filter(a => a.status === 'healthy').length,
      warning: processedAccounts.filter(a => a.status === 'warning').length,
      critical: processedAccounts.filter(a => a.status === 'critical').length,
      inactive: processedAccounts.filter(a => a.status === 'inactive').length,
      readyToSend: processedAccounts.filter(a => a.ready_to_send).length,
      avgScore: activeAccounts.length > 0 
        ? Math.round(activeAccounts.reduce((sum, a) => sum + a.warmup_score, 0) / activeAccounts.length)
        : 0,
      avgWarmupAge: activeAccounts.length > 0
        ? Math.round(activeAccounts.filter(a => a.warmup_age_days !== null).reduce((sum, a) => sum + (a.warmup_age_days || 0), 0) / Math.max(1, activeAccounts.filter(a => a.warmup_age_days !== null).length))
        : 0,
      avgDailyEmails: activeAccounts.length > 0
        ? Math.round(activeAccounts.reduce((sum, a) => sum + a.daily_avg_sent, 0) / activeAccounts.length)
        : 0,
      avgReplyRate: activeAccounts.length > 0
        ? Math.round(activeAccounts.reduce((sum, a) => sum + a.reply_rate, 0) / activeAccounts.length)
        : 0,
      totalWarmupSent: processedAccounts.reduce((sum, a) => sum + a.warmup_emails_sent, 0),
      totalReplies: processedAccounts.reduce((sum, a) => sum + a.warmup_replies_received, 0),
      totalSavedFromSpam: processedAccounts.reduce((sum, a) => sum + a.warmup_emails_saved_from_spam, 0),
      totalBounces: processedAccounts.reduce((sum, a) => sum + a.warmup_bounces_caused_count, 0)
    }

    return NextResponse.json({
      success: true,
      clientName,
      platform: 'bison',
      summary,
      accounts: processedAccounts
    })

  } catch (error) {
    console.error('Error in Bison warmup stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
