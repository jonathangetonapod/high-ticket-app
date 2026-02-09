import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface Lead {
  email: string
  reply?: string
  reply_text?: string
  status?: string
  timestamp?: string
  created_at?: string
  replied_at?: string
}

interface Communication {
  id: string
  clientName: string
  clientId: string
  platform: 'instantly' | 'bison'
  leadEmail: string
  replySnippet: string
  fullReply: string
  timestamp: string
  sentiment: 'interested' | 'not_interested' | 'question' | 'auto_reply'
}

async function callBridgeKit(command: string): Promise<any> {
  try {
    const { stdout, stderr } = await execAsync(`mcporter call ${command}`, {
      timeout: 30000,
    })
    if (stderr) console.error('BridgeKit stderr:', stderr)
    return JSON.parse(stdout)
  } catch (error: any) {
    console.error(`BridgeKit error for ${command}:`, error.message)
    return null
  }
}

function detectSentiment(text: string): Communication['sentiment'] {
  const lowerText = text.toLowerCase()
  
  // Auto-reply patterns
  const autoReplyPatterns = [
    'out of office', 'ooo', 'auto-reply', 'automatic reply',
    'currently unavailable', 'on vacation', 'be back on',
    'this is an automated', 'do not reply', 'noreply'
  ]
  if (autoReplyPatterns.some(p => lowerText.includes(p))) {
    return 'auto_reply'
  }
  
  // Interested patterns
  const interestedPatterns = [
    'interested', 'tell me more', 'sounds good', 'let\'s chat',
    'schedule a call', 'set up a meeting', 'book a time',
    'love to learn more', 'sounds interesting', 'I\'d like to',
    'yes please', 'great', 'perfect', 'awesome'
  ]
  if (interestedPatterns.some(p => lowerText.includes(p))) {
    return 'interested'
  }
  
  // Not interested patterns
  const notInterestedPatterns = [
    'not interested', 'no thanks', 'unsubscribe', 'remove me',
    'stop emailing', 'not for us', 'don\'t contact', 'please remove',
    'not looking', 'not a good fit', 'pass on this'
  ]
  if (notInterestedPatterns.some(p => lowerText.includes(p))) {
    return 'not_interested'
  }
  
  // Question patterns - default if has question marks
  if (lowerText.includes('?') || lowerText.includes('how') || lowerText.includes('what') || lowerText.includes('when')) {
    return 'question'
  }
  
  return 'question' // Default to question for unclear responses
}

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') || 'all'
    const clientFilter = searchParams.get('client') || ''
    const days = parseInt(searchParams.get('days') || '3')

    console.log('Fetching communications from BridgeKit...')

    // Fetch active clients from both platforms
    const [instantlyClients, bisonClients] = await Promise.all([
      platform !== 'bison' ? callBridgeKit(`bridgekit.get_active_instantly_clients days=${days + 4}`) : null,
      platform !== 'instantly' ? callBridgeKit(`bridgekit.get_active_bison_clients days=${days + 4}`) : null
    ])

    const communications: Communication[] = []
    const clientsToFetch: Array<{ name: string; id: string; platform: 'instantly' | 'bison' }> = []

    // Collect Instantly clients
    if (instantlyClients?.clients) {
      const clients = instantlyClients.clients.slice(0, 10)
      for (const client of clients) {
        if (!clientFilter || client.name?.toLowerCase().includes(clientFilter.toLowerCase())) {
          clientsToFetch.push({
            name: client.name || client.workspace_name,
            id: client.workspace_id,
            platform: 'instantly'
          })
        }
      }
    }

    // Collect Bison clients
    if (bisonClients?.clients) {
      const clients = bisonClients.clients.slice(0, 10)
      for (const client of clients) {
        if (!clientFilter || client.name?.toLowerCase().includes(clientFilter.toLowerCase())) {
          clientsToFetch.push({
            name: client.name,
            id: client.name,
            platform: 'bison'
          })
        }
      }
    }

    // Fetch leads for each client (batched for performance)
    const leadPromises = clientsToFetch.map(async (client) => {
      const command = client.platform === 'instantly'
        ? `bridgekit.get_instantly_leads workspace_id="${client.id}" days=${days}`
        : `bridgekit.get_bison_leads client_name="${client.name}" days=${days}`
      
      const result = await callBridgeKit(command)
      return { client, result }
    })

    const leadResults = await Promise.all(leadPromises)

    // Process leads into communications
    for (const { client, result } of leadResults) {
      if (!result?.leads) continue

      for (const lead of result.leads) {
        const replyText = lead.reply || lead.reply_text || lead.last_reply || ''
        if (!replyText) continue

        communications.push({
          id: `${client.platform}-${client.id}-${lead.email}-${Date.now()}-${Math.random()}`,
          clientName: client.name,
          clientId: client.id,
          platform: client.platform,
          leadEmail: lead.email,
          replySnippet: truncateText(replyText),
          fullReply: replyText,
          timestamp: lead.replied_at || lead.timestamp || lead.created_at || new Date().toISOString(),
          sentiment: detectSentiment(replyText)
        })
      }
    }

    // Sort by timestamp (newest first)
    communications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Calculate stats
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    const stats = {
      repliesToday: communications.filter(c => new Date(c.timestamp) >= todayStart).length,
      repliesThisWeek: communications.filter(c => new Date(c.timestamp) >= weekStart).length,
      interestedLeads: communications.filter(c => c.sentiment === 'interested').length,
      activeClients: new Set(communications.map(c => c.clientName)).size,
      totalReplies: communications.length
    }

    console.log(`✓ Found ${communications.length} communications from ${clientsToFetch.length} clients`)

    return NextResponse.json({
      success: true,
      communications,
      stats,
      clients: clientsToFetch.map(c => ({ name: c.name, id: c.id, platform: c.platform }))
    })

  } catch (error: any) {
    console.error('Error fetching communications:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
