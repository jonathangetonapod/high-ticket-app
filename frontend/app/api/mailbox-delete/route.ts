import { NextRequest, NextResponse } from 'next/server'

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'
const BISON_API_BASE = 'https://send.leadgenjay.com/api'

// Google Sheets config
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY/edit'
const INSTANTLY_GID = '928115249'
const BISON_GID = '1631680229'

// Fetch API key for a client from Google Sheets
async function getApiKey(clientName: string, platform: 'instantly' | 'bison'): Promise<string | null> {
  const spreadsheetId = SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  if (!spreadsheetId) return null

  const gid = platform === 'instantly' ? INSTANTLY_GID : BISON_GID
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  
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
      
      if (platform === 'instantly') {
        // Instantly: workspace_id (0), api_key (1), workspace_name (2), client_name (3)
        const rowClientName = values[3] || ''
        const apiKey = values[1] || ''
        if (rowClientName.toLowerCase() === clientName.toLowerCase()) {
          return apiKey
        }
      } else {
        // Bison: client_name (0), api_key (1)
        const rowClientName = values[0] || ''
        const apiKey = values[1] || ''
        if (rowClientName.toLowerCase() === clientName.toLowerCase()) {
          return apiKey
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching API key:', error)
    return null
  }
}

// Delete Instantly account
async function deleteInstantlyAccount(apiKey: string, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${INSTANTLY_API_BASE}/accounts/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
      }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// Delete Bison account
async function deleteBisonAccount(apiKey: string, accountId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BISON_API_BASE}/sender-emails/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
      }
    }

    const data = await response.json()
    return { success: data?.data?.success || true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, clientName, email, bisonId } = body

    if (!platform || !clientName || !email) {
      return NextResponse.json(
        { success: false, error: 'platform, clientName, and email are required' },
        { status: 400 }
      )
    }

    if (platform === 'bison' && !bisonId) {
      return NextResponse.json(
        { success: false, error: 'bisonId is required for Bison accounts' },
        { status: 400 }
      )
    }

    // Get API key for client
    const apiKey = await getApiKey(clientName, platform)
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: `No API key found for client: ${clientName}` },
        { status: 404 }
      )
    }

    // Delete based on platform
    let result: { success: boolean; error?: string }

    if (platform === 'instantly') {
      result = await deleteInstantlyAccount(apiKey, email)
    } else {
      result = await deleteBisonAccount(apiKey, bisonId)
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete account' },
        { status: 500 }
      )
    }

    console.log(`✓ Deleted ${platform} account: ${email} (client: ${clientName})`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${email}`,
      platform,
      email
    })

  } catch (error: any) {
    console.error('Error deleting mailbox:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
