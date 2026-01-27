// Bison Client - Email warmup and sender account management
// API Documentation: https://send.leadgenjay.com/api/warmup

const BISON_API_BASE_URL = 'https://send.leadgenjay.com/api'

interface BisonSenderAccount {
  id: number
  email: string
  name: string
  domain?: string
  email_signature?: string
  imap_server?: string
  imap_port?: number
  smtp_server?: string
  smtp_port?: number
  daily_limit: number
  type: string
  status: string
  emails_sent_count: number
  total_replied_count: number
  total_opened_count: number
  unsubscribed_count: number
  bounced_count: number
  unique_replied_count: number
  unique_opened_count: number
  total_leads_contacted_count: number
  interested_leads_count: number
  created_at: string
  updated_at: string
  tags: Array<{
    id: number
    name: string
    default: boolean
  }>
  // Warmup-specific fields (if using warmup endpoint)
  warmup_emails_sent?: number
  warmup_replies_received?: number
  warmup_emails_saved_from_spam?: number
  warmup_score?: number
  warmup_bounces_received_count?: number
  warmup_bounces_caused_count?: number
  warmup_disabled_for_bouncing_count?: number
}

/**
 * Get Bison API key for a client from Google Sheets
 */
async function getBisonApiKey(clientName: string): Promise<string | null> {
  try {
    // Fetch from the same Google Sheet we use for client listing
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
    const BISON_GID = '1631680229' // Bison Workspaces tab
    const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]

    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL')
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${BISON_GID}`

    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`)
    }

    const csvText = await response.text()
    const lines = csvText.trim().split('\n')

    if (lines.length < 2) {
      throw new Error('Sheet has no data')
    }

    // Parse CSV to find matching client
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      // Simple CSV parsing - Column A: client_name, Column B: api_key
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

      const rowClientName = values[0] || ''
      const apiKey = values[1] || ''

      // Skip header rows
      if (rowClientName.toLowerCase().includes('client') ||
          rowClientName.toLowerCase().includes('name')) {
        continue
      }

      // Match client name (case-insensitive, exact match)
      if (rowClientName.toLowerCase() === clientName.toLowerCase()) {
        return apiKey
      }
    }

    throw new Error(`Client '${clientName}' not found in Bison sheet`)

  } catch (error) {
    console.error('Error fetching Bison API key:', error)
    return null
  }
}

/**
 * Make authenticated request to Bison API
 */
async function makeBisonRequest<T>(
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!apiKey) {
    throw new Error('Bison API key is required')
  }

  // Build query string
  const queryParams = new URLSearchParams(params)
  const url = `${BISON_API_BASE_URL}${endpoint}?${queryParams.toString()}`

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
        throw new Error('Invalid Bison API key')
      } else if (response.status === 404) {
        throw new Error('Resource not found')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      } else {
        throw new Error(`Bison API error: ${response.statusText}`)
      }
    }

    return await response.json()

  } catch (error) {
    console.error('Error making Bison API request:', error)
    throw error
  }
}

/**
 * Fetch sender email accounts with campaign stats and creation dates
 * Endpoint: GET /sender-emails
 *
 * Returns mailbox details including created_at timestamp
 */
async function fetchSenderEmailAccounts(apiKey: string): Promise<BisonSenderAccount[]> {
  try {
    const allAccounts: BisonSenderAccount[] = []
    const maxPages = 50

    console.log('Fetching sender email accounts with creation dates...')

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await makeBisonRequest<{ data: BisonSenderAccount[] }>(
          '/sender-emails',
          apiKey,
          { page: String(page) }
        )

        const pageData = response.data || []
        console.log(`Sender emails page ${page}: ${pageData.length} accounts`)

        if (pageData.length === 0) {
          break
        }

        allAccounts.push(...pageData)

        if (pageData.length < 15) {
          break
        }
      } catch (error) {
        console.warn(`Error fetching sender emails page ${page}:`, error)
        break
      }
    }

    console.log(`Fetched ${allAccounts.length} total sender email accounts`)
    return allAccounts

  } catch (error) {
    console.error('Error fetching sender email accounts:', error)
    return []
  }
}

/**
 * List email accounts with warmup stats
 * Endpoint: GET /warmup/sender-emails
 *
 * Retrieves email accounts with warmup statistics for the specified date range
 * Automatically paginates to fetch ALL mailboxes (Bison returns 15 per page)
 */
export async function listBisonSenderEmails(options: {
  clientName: string
  startDate?: string // YYYY-MM-DD format
  endDate?: string   // YYYY-MM-DD format
}): Promise<{
  success: boolean
  client_name: string
  date_range: { start: string; end: string }
  total_accounts: number
  accounts: BisonSenderAccount[]
  health_summary: {
    total: number
    healthy: number
    warning: number
    critical: number
    avg_warmup_score: number
  }
  error?: string
}> {
  try {
    const { clientName, startDate, endDate } = options

    console.log(`Fetching Bison sender emails for ${clientName}...`)

    // Get API key from Google Sheet
    const apiKey = await getBisonApiKey(clientName)
    if (!apiKey) {
      throw new Error(`No API key found for client '${clientName}'`)
    }

    // Default date range: last 90 days (as per Bison API recommendation)
    const end = endDate || new Date().toISOString().split('T')[0]
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch ALL sender emails with pagination
    // Bison API returns 15 results per page by default
    // Standard clients have 50-80+ mailboxes
    const allAccounts: BisonSenderAccount[] = []
    const maxPages = 50 // Fetch up to 50 pages (750 mailboxes)

    console.log(`Starting pagination for sender emails (fetching up to ${maxPages} pages)`)

    for (let page = 1; page <= maxPages; page++) {
      console.log(`Fetching sender emails page ${page}`)

      try {
        const response = await makeBisonRequest<{ data: BisonSenderAccount[] }>(
          '/warmup/sender-emails',
          apiKey,
          {
            start_date: start,
            end_date: end,
            page: String(page),
          }
        )

        const pageData = response.data || []
        console.log(`Page ${page} returned ${pageData.length} accounts (total so far: ${allAccounts.length + pageData.length})`)

        if (pageData.length === 0) {
          console.log(`No data on page ${page}, stopping pagination`)
          break
        }

        allAccounts.push(...pageData)

        // If we got less than 15 results, we're on the last page
        if (pageData.length < 15) {
          console.log(`Got ${pageData.length} < 15 results, last page reached`)
          break
        }

      } catch (error) {
        console.warn(`Error fetching page ${page}:`, error)
        break
      }
    }

    console.log(`Pagination complete: fetched ${allAccounts.length} total sender emails`)

    // Fetch sender email accounts to get created_at timestamps
    const senderAccounts = await fetchSenderEmailAccounts(apiKey)

    // Create lookup map by email for faster merging
    const senderAccountMap = new Map(
      senderAccounts.map(acc => [acc.email.toLowerCase(), acc])
    )

    // Merge warmup data with sender account data (including created_at)
    const accounts = allAccounts.map(warmupAccount => {
      const senderAccount = senderAccountMap.get(warmupAccount.email.toLowerCase())
      if (senderAccount) {
        return {
          ...warmupAccount,
          created_at: senderAccount.created_at,
          updated_at: senderAccount.updated_at,
          status: senderAccount.status,
          daily_limit: senderAccount.daily_limit,
          type: senderAccount.type,
        }
      }
      return warmupAccount
    })

    console.log(`Merged warmup data with sender account details for ${accounts.length} accounts`)

    // Calculate health summary based on industry warmup best practices
    let healthy = 0
    let warning = 0
    let critical = 0
    let totalWarmupScore = 0

    accounts.forEach(account => {
      const score = account.warmup_score || 0
      totalWarmupScore += score

      // Industry-standard warmup practices:
      // - Minimum 14 days warmup (~10 emails/day = 140 emails)
      // - Bounce rate should be < 2% (excellent), 2-5% (acceptable), > 5% (critical)
      // - Warmup score: 50+ (good), 30-49 (warning), < 30 (critical)

      const emailsSent = account.warmup_emails_sent || 0
      const bouncesCaused = account.warmup_bounces_caused_count || 0
      const bounceRate = emailsSent > 0 ? (bouncesCaused / emailsSent) * 100 : 0

      const hasMinimumWarmup = emailsSent >= 140 // 14+ days
      const isDisabled = account.warmup_disabled_for_bouncing_count > 0

      // CRITICAL: Disabled or severe issues
      if (isDisabled || score < 30 || bounceRate > 5) {
        critical++
      }
      // WARNING: Needs attention but not critical
      else if (!hasMinimumWarmup || score < 50 || bounceRate > 2) {
        warning++
      }
      // HEALTHY: Ready to send
      else {
        healthy++
      }
    })

    const avgWarmupScore = accounts.length > 0 ? totalWarmupScore / accounts.length : 0

    console.log(`✓ Loaded ${accounts.length} sender accounts (${healthy} healthy, ${warning} warning, ${critical} critical)`)

    return {
      success: true,
      client_name: clientName,
      date_range: { start, end },
      total_accounts: accounts.length,
      accounts,
      health_summary: {
        total: accounts.length,
        healthy,
        warning,
        critical,
        avg_warmup_score: Math.round(avgWarmupScore),
      },
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in listBisonSenderEmails:', errorMsg)

    return {
      success: false,
      client_name: options.clientName,
      date_range: { start: '', end: '' },
      total_accounts: 0,
      accounts: [],
      health_summary: {
        total: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
        avg_warmup_score: 0,
      },
      error: errorMsg,
    }
  }
}
