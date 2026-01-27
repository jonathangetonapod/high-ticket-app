// Google Sheets Client - Replicates Python implementation from gmail-reply-tracker-mcp
// Uses the same Google Sheet for client data

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
const INSTANTLY_GID = '928115249'  // Instantly Workspaces tab
const BISON_GID = '1631680229'     // Bison Workspaces tab

interface InstantlyClient {
  workspace_id: string
  client_name: string
  workspace_name?: string
  client_email?: string
}

interface BisonClient {
  client_name: string
}

/**
 * Convert Google Sheets URL to CSV export URL
 * Replicates: _convert_sheets_url_to_csv() from leads.py
 */
function convertSheetsToCsvUrl(sheetUrl: string, gid?: string): string {
  // Extract spreadsheet ID from URL
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (!match) {
    throw new Error(`Invalid Google Sheets URL: ${sheetUrl}`)
  }

  const spreadsheetId = match[1]

  // Build CSV export URL
  let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
  if (gid) {
    csvUrl += `&gid=${gid}`
  }

  return csvUrl
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  // First line is headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  // Parse remaining lines
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Simple CSV parsing (handles quoted values)
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
    values.push(currentValue.trim()) // Last value

    // Create object from headers and values
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

/**
 * Fetch data from Google Sheets as parsed objects
 * Replicates: _fetch_sheet_data() from leads.py
 */
async function fetchSheetData(sheetUrl: string, gid?: string): Promise<Record<string, string>[]> {
  const csvUrl = convertSheetsToCsvUrl(sheetUrl, gid)

  try {
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
      cache: 'no-store', // Always fetch fresh data
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`)
    }

    const csvText = await response.text()
    return parseCSV(csvText)

  } catch (error) {
    console.error('Error fetching sheet data:', error)
    throw error
  }
}

/**
 * Get list of all Instantly.ai clients/workspaces
 * Replicates: get_client_list() from leads.py
 */
export async function getInstantlyClients(): Promise<{
  success: boolean
  total_clients: number
  clients: InstantlyClient[]
  error?: string
}> {
  try {
    console.log('Fetching Instantly client list from Google Sheets...')

    // Fetch data from Instantly tab
    const rows = await fetchSheetData(SHEET_URL, INSTANTLY_GID)

    // Expected columns from Google Sheet:
    // Column A: workspace_id (UUID)
    // Column B: api_key (not returned to frontend)
    // Column C: workspace_name
    // Column D: client_name (person name)
    // Column E: client_email
    // Column F: action/status

    const clients: InstantlyClient[] = []
    const seen = new Set<string>()

    for (const row of rows) {
      // Get workspace_id from first column (various possible header names)
      const workspaceId = row['workspace_id'] || row['Workspace ID'] || row['id'] || Object.values(row)[0]

      // Get client_name from appropriate column
      const clientName = row['client_name'] || row['Client Name'] || row['person_name'] || Object.values(row)[3]

      // Get workspace_name from column C
      const workspaceName = row['workspace_name'] || row['Workspace Name'] || Object.values(row)[2]

      // Get client_email from column E
      const clientEmail = row['client_email'] || row['Client Email'] || Object.values(row)[4]

      // Skip if no workspace_id or client_name
      if (!workspaceId || !clientName) continue

      // Skip header rows (heuristic detection)
      if (workspaceId.toLowerCase().includes('workspace') ||
          workspaceId.toLowerCase().includes('id')) continue

      // Deduplicate by workspace_id
      if (seen.has(workspaceId)) continue
      seen.add(workspaceId)

      clients.push({
        workspace_id: workspaceId.trim(),
        client_name: clientName.trim(),
        workspace_name: workspaceName?.trim(),
        client_email: clientEmail?.trim(),
      })
    }

    console.log(`Found ${clients.length} Instantly clients`)

    return {
      success: true,
      total_clients: clients.length,
      clients,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getInstantlyClients:', errorMsg)

    return {
      success: false,
      total_clients: 0,
      clients: [],
      error: errorMsg,
    }
  }
}

/**
 * Get list of all Bison clients
 * Replicates: get_bison_client_list() from leads.py
 */
export async function getBisonClients(): Promise<{
  success: boolean
  total_clients: number
  clients: BisonClient[]
  error?: string
}> {
  try {
    console.log('Fetching Bison client list from Google Sheets...')

    // Fetch data from Bison tab
    const rows = await fetchSheetData(SHEET_URL, BISON_GID)

    // Expected columns from Google Sheet:
    // Column A: client_name
    // Column B: api_key (not returned to frontend)

    const clientNames = new Set<string>()

    for (const row of rows) {
      // Get client_name from first column
      const clientName = row['client_name'] || row['Client Name'] || Object.values(row)[0]

      // Skip if no client_name
      if (!clientName) continue

      // Skip header rows
      if (clientName.toLowerCase().includes('client') ||
          clientName.toLowerCase().includes('name')) continue

      clientNames.add(clientName.trim())
    }

    // Convert Set to array of objects
    const clients: BisonClient[] = Array.from(clientNames).map(name => ({
      client_name: name
    }))

    console.log(`Found ${clients.length} Bison clients`)

    return {
      success: true,
      total_clients: clients.length,
      clients,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getBisonClients:', errorMsg)

    return {
      success: false,
      total_clients: 0,
      clients: [],
      error: errorMsg,
    }
  }
}

/**
 * Get all clients (both Instantly and Bison combined)
 */
export async function getAllClients() {
  try {
    // Fetch both in parallel
    const [instantlyResult, bisonResult] = await Promise.all([
      getInstantlyClients(),
      getBisonClients(),
    ])

    // Combine results
    const allClients = [
      ...instantlyResult.clients.map(c => ({
        id: c.workspace_id,
        name: c.client_name,
        platform: 'instantly' as const,
        workspaceId: c.workspace_id,
        workspaceName: c.workspace_name,
        email: c.client_email,
      })),
      ...bisonResult.clients.map(c => ({
        id: c.client_name,
        name: c.client_name,
        platform: 'bison' as const,
        workspaceId: c.client_name, // Bison uses client name as ID
      })),
    ]

    return {
      success: true,
      total: allClients.length,
      instantly_count: instantlyResult.clients.length,
      bison_count: bisonResult.clients.length,
      clients: allClients,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getAllClients:', errorMsg)

    return {
      success: false,
      error: errorMsg,
    }
  }
}
