// Instantly.ai Client - Campaign and email sequence management
// API Documentation: https://developer.instantly.ai/api/v2

const INSTANTLY_API_BASE_URL = 'https://api.instantly.ai/api/v2'

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
 * Get Instantly API key for a client from Google Sheets
 */
async function getInstantlyApiKey(clientName: string): Promise<string | null> {
  try {
    // Fetch from the same Google Sheet we use for client listing
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
    const INSTANTLY_GID = '850839039' // Instantly Workspaces tab
    const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]

    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL')
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${INSTANTLY_GID}`

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

    throw new Error(`Client '${clientName}' not found in Instantly sheet`)

  } catch (error) {
    console.error('Error fetching Instantly API key:', error)
    return null
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
        const response = await makeInstantlyRequest<{ campaigns: any[]; next_starting_after?: string }>(
          '/campaigns',
          apiKey,
          params
        )

        const campaigns = response.campaigns || []
        console.log(`Page ${page} returned ${campaigns.length} campaigns`)

        if (campaigns.length === 0) {
          break
        }

        allCampaigns.push(...campaigns)

        // Check if there's more data
        if (!response.next_starting_after) {
          break
        }

        startingAfter = response.next_starting_after
      } catch (error) {
        console.warn(`Error fetching campaigns page ${page}:`, error)
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

    // Extract sequences
    const sequences = (campaign.sequences || []).map((seq: any, index: number) => ({
      step: index + 1,
      subject: seq.subject || '',
      body: seq.body || '',
      delay_hours: seq.delay_in_hours || 0,
      variants: seq.variants || []
    }))

    console.log(`✓ Loaded campaign with ${sequences.length} sequences`)

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
