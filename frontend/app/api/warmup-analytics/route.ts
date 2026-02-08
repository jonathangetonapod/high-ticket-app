import { NextRequest, NextResponse } from 'next/server'

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'

// Google Sheets config for API keys
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
const INSTANTLY_GID = '928115249'

interface WarmupDayData {
  sent: number
  landed_inbox: number
  landed_spam: number
  received: number
}

interface WarmupAnalyticsResponse {
  email_date_data: {
    [email: string]: {
      [date: string]: WarmupDayData
    }
  }
  aggregate_data: {
    [email: string]: {
      sent: number
      landed_inbox: number
      landed_spam: number
      received: number
      health_score: number
      health_score_label: string
    }
  }
}

interface AccountDetails {
  email: string
  timestamp_warmup_start?: string
  warmup?: {
    limit?: number
    reply_rate?: number
  }
}

// Fetch API key for a client from Google Sheets
async function getApiKey(clientName: string): Promise<string | null> {
  const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  if (!spreadsheetId) return null

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${INSTANTLY_GID}`
  
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
      
      // Column D: client_name, Column B: api_key
      const rowClientName = values[3] || ''
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

// Fetch account details to get warmup start dates
async function fetchAccountDetails(emails: string[], apiKey: string): Promise<Map<string, AccountDetails>> {
  const detailsMap = new Map<string, AccountDetails>()
  
  try {
    // Fetch accounts list with details
    const response = await fetch(`${INSTANTLY_API_BASE}/accounts?limit=100`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })
    
    if (response.ok) {
      const data = await response.json()
      const accounts = data.items || data || []
      
      for (const account of accounts) {
        if (emails.includes(account.email)) {
          detailsMap.set(account.email, {
            email: account.email,
            timestamp_warmup_start: account.timestamp_warmup_start,
            warmup: account.warmup
          })
        }
      }
    }
  } catch (error) {
    console.error('Error fetching account details:', error)
  }
  
  return detailsMap
}

// Fetch warmup analytics from Instantly API
async function fetchWarmupAnalytics(emails: string[], apiKey: string): Promise<WarmupAnalyticsResponse | null> {
  try {
    const response = await fetch(`${INSTANTLY_API_BASE}/accounts/warmup-analytics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emails }),
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Warmup analytics API error: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching warmup analytics:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName, emails } = body

    if (!clientName || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'clientName and emails[] required' },
        { status: 400 }
      )
    }

    // Limit to 100 emails per request (API limit)
    const emailsToFetch = emails.slice(0, 100)

    // Get API key for client
    const apiKey = await getApiKey(clientName)
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: `No API key found for client: ${clientName}` },
        { status: 404 }
      )
    }

    // Fetch warmup analytics and account details in parallel
    const [analytics, accountDetails] = await Promise.all([
      fetchWarmupAnalytics(emailsToFetch, apiKey),
      fetchAccountDetails(emailsToFetch, apiKey)
    ])
    
    if (!analytics) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch warmup analytics from Instantly' },
        { status: 500 }
      )
    }

    // Process and enhance the data
    const processedData: Record<string, {
      email: string
      totalSent: number
      totalInbox: number
      totalSpam: number
      totalReceived: number
      healthScore: number
      inboxRate: number
      daysActive: number
      warmupStartDate: string | null
      warmupAgeDays: number | null
      dailyAvgSent: number
      dailyAvgInbox: number
      warmupLimit: number | null
      replyRate: number | null
      readyToSend: boolean
      daysUntilReady: number | null
      dailyData: Array<{
        date: string
        sent: number
        landed_inbox: number
        landed_spam: number
        received: number
      }>
      status: 'healthy' | 'warning' | 'critical' | 'inactive'
      issues: string[]
    }> = {}

    for (const email of emailsToFetch) {
      const dateData = analytics.email_date_data?.[email] || {}
      const aggregate = analytics.aggregate_data?.[email] || {
        sent: 0,
        landed_inbox: 0,
        landed_spam: 0,
        received: 0,
        health_score: 0
      }
      const details = accountDetails.get(email)

      // Convert date data to sorted array
      const dailyData = Object.entries(dateData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const daysActive = dailyData.length
      const inboxRate = aggregate.sent > 0 
        ? Math.round((aggregate.landed_inbox / aggregate.sent) * 100) 
        : 0

      // Warmup start date from account details
      let warmupStartDate: string | null = null
      let warmupAgeDays: number | null = null
      
      if (details?.timestamp_warmup_start) {
        const startDate = new Date(details.timestamp_warmup_start)
        warmupStartDate = startDate.toISOString().split('T')[0]
        warmupAgeDays = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      } else if (dailyData.length > 0) {
        // Estimate from first day of data
        warmupStartDate = dailyData[0].date
        warmupAgeDays = daysActive
      }

      // Daily averages
      const dailyAvgSent = daysActive > 0 ? Math.round(aggregate.sent / daysActive) : 0
      const dailyAvgInbox = daysActive > 0 ? Math.round(aggregate.landed_inbox / daysActive) : 0

      // Warmup settings
      const warmupLimit = details?.warmup?.limit || null
      const replyRate = details?.warmup?.reply_rate ? Math.round(details.warmup.reply_rate * 100) : null

      // Use RECENT activity (daysActive) for readiness, not original start date
      // An account that was paused and restarted needs to re-warm
      const recentDays = daysActive // Days with actual warmup activity in last 30 days
      
      // Readiness calculation (14+ days RECENT activity, 500+ emails, 70%+ health)
      const isReady = recentDays >= 14 && aggregate.sent >= 500 && aggregate.health_score >= 70
      const daysUntilReady = isReady ? null : Math.max(0, 14 - recentDays)

      // Determine status and issues
      const issues: string[] = []
      let status: 'healthy' | 'warning' | 'critical' | 'inactive' = 'healthy'

      if (aggregate.sent === 0) {
        status = 'inactive'
        issues.push('Warmup not active')
      } else if (recentDays < 7) {
        status = 'critical'
        issues.push(`Only ${recentDays} days active`)
      } else if (recentDays < 14) {
        status = 'warning'
        issues.push(`${recentDays} days active (need 14+)`)
      }

      if (aggregate.sent > 0 && aggregate.sent < 200) {
        if (status !== 'inactive') status = 'critical'
        issues.push(`Only ${aggregate.sent} emails sent`)
      } else if (aggregate.sent > 0 && aggregate.sent < 500) {
        if (status === 'healthy') status = 'warning'
        issues.push(`${aggregate.sent} emails (need 500+)`)
      }

      if (aggregate.health_score < 50 && aggregate.sent > 0) {
        status = 'critical'
        issues.push(`Health: ${aggregate.health_score}%`)
      } else if (aggregate.health_score < 70 && aggregate.sent > 0) {
        if (status === 'healthy') status = 'warning'
        issues.push(`Health: ${aggregate.health_score}%`)
      }

      if (inboxRate < 80 && aggregate.sent > 0) {
        status = 'critical'
        issues.push(`Inbox: ${inboxRate}%`)
      } else if (inboxRate < 90 && aggregate.sent > 0) {
        if (status === 'healthy') status = 'warning'
        issues.push(`Inbox: ${inboxRate}%`)
      }

      processedData[email] = {
        email,
        totalSent: aggregate.sent,
        totalInbox: aggregate.landed_inbox,
        totalSpam: aggregate.landed_spam,
        totalReceived: aggregate.received,
        healthScore: aggregate.health_score,
        inboxRate,
        daysActive,
        warmupStartDate,
        warmupAgeDays,
        dailyAvgSent,
        dailyAvgInbox,
        warmupLimit,
        replyRate,
        readyToSend: isReady,
        daysUntilReady,
        dailyData,
        status,
        issues
      }
    }

    // Summary stats
    const allData = Object.values(processedData)
    const summary = {
      totalEmails: emailsToFetch.length,
      healthy: allData.filter(d => d.status === 'healthy').length,
      warning: allData.filter(d => d.status === 'warning').length,
      critical: allData.filter(d => d.status === 'critical').length,
      inactive: allData.filter(d => d.status === 'inactive').length,
      readyToSend: allData.filter(d => d.readyToSend).length,
      avgHealthScore: Math.round(allData.reduce((sum, d) => sum + d.healthScore, 0) / emailsToFetch.length),
      avgInboxRate: Math.round(allData.filter(d => d.totalSent > 0).reduce((sum, d) => sum + d.inboxRate, 0) / Math.max(1, allData.filter(d => d.totalSent > 0).length)),
      totalWarmupEmailsSent: allData.reduce((sum, d) => sum + d.totalSent, 0),
      avgDailyEmails: Math.round(allData.reduce((sum, d) => sum + d.dailyAvgSent, 0) / emailsToFetch.length),
      avgWarmupAge: Math.round(allData.filter(d => d.warmupAgeDays !== null).reduce((sum, d) => sum + (d.warmupAgeDays || 0), 0) / Math.max(1, allData.filter(d => d.warmupAgeDays !== null).length))
    }

    return NextResponse.json({
      success: true,
      clientName,
      platform: 'instantly',
      summary,
      analytics: processedData
    })

  } catch (error) {
    console.error('Error in warmup analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
