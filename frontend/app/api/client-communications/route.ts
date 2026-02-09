import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getAllClients } from '@/lib/sheets'
import { listSlackChannels, getSlackChannelHistory } from '@/lib/slack'
import { createServerClient } from '@/lib/supabase/server'

const execAsync = promisify(exec)

// Lazy-load supabase to avoid build-time errors
const getSupabase = () => createServerClient()

interface Email {
  id: string
  thread_id: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
  timestamp?: string
  labels?: string[]
}

interface EmailResult {
  emails?: Email[]
  results?: Email[]  // BridgeKit returns 'results'
  count?: number
  error?: string
}

interface SlackChannel {
  id: string
  name: string
  type: string
  topic: string
  purpose: string
  member_count: number
  is_member: boolean
  is_archived: boolean
}

interface SlackMessage {
  ts: string
  user_id: string
  username: string
  real_name: string
  text: string
  thread_ts?: string
  reply_count?: number
  reactions?: any[]
  timestamp: string
}

interface ClientCommunication {
  id?: string
  client_name: string
  platform: string
  last_email_date: string | null
  last_email_subject: string | null
  last_email_from: string | null
  emails_7d: number
  emails_30d: number
  meetings_7d: number
  unreplied_count: number
  days_since_contact: number
  status: string
  updated_at: string
  // Slack fields
  slack_channel: string | null
  last_slack_date: string | null
  slack_messages_7d: number
  last_slack_from: string | null
}

// Ensure table exists with all columns
async function ensureTable() {
  try {
    // Try to create the table if it doesn't exist
    const { error } = await getSupabase().rpc('exec_sql' as any, {
      sql: `
        CREATE TABLE IF NOT EXISTS client_communications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_name TEXT NOT NULL,
          platform TEXT,
          last_email_date TIMESTAMPTZ,
          last_email_subject TEXT,
          last_email_from TEXT,
          emails_7d INTEGER DEFAULT 0,
          emails_30d INTEGER DEFAULT 0,
          meetings_7d INTEGER DEFAULT 0,
          unreplied_count INTEGER DEFAULT 0,
          days_since_contact INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          slack_channel TEXT,
          last_slack_date TIMESTAMPTZ,
          slack_messages_7d INTEGER DEFAULT 0,
          last_slack_from TEXT,
          UNIQUE(client_name)
        );
        CREATE INDEX IF NOT EXISTS idx_client_communications_name ON client_communications(client_name);
        CREATE INDEX IF NOT EXISTS idx_client_communications_status ON client_communications(status);
        CREATE INDEX IF NOT EXISTS idx_client_communications_slack_channel ON client_communications(slack_channel);
      `
    })
    if (error) {
      console.log('RPC not available, table should exist via migration')
    }
  } catch {
    // RPC might not exist, check if table exists
    try {
      await getSupabase().from('client_communications').select('id').limit(1)
    } catch (e) {
      console.error('Table check failed:', e)
    }
  }
}

async function callBridgeKit(command: string): Promise<any> {
  try {
    const { stdout, stderr } = await execAsync(`mcporter call ${command}`, {
      timeout: 60000,
    })
    if (stderr) console.error('BridgeKit stderr:', stderr)
    return JSON.parse(stdout)
  } catch (error: any) {
    console.error(`BridgeKit error for ${command}:`, error.message)
    return null
  }
}

function calculateDaysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function getStatus(daysSinceContact: number): string {
  if (daysSinceContact >= 14) return 'critical'
  if (daysSinceContact >= 7) return 'warning'
  return 'active'
}

// Health Score Calculation (0-100)
interface HealthScore {
  total: number
  bracket: 'healthy' | 'needs_attention' | 'at_risk'
  components: {
    recency: number
    volume: number
    trend: number
    multiChannel: number
  }
  trend: 'up' | 'down' | 'stable'
}

function calculateHealthScore(client: any): HealthScore {
  // 1. Recency Score (0-35)
  let recency: number
  const days = client.days_since_contact || 999
  if (days <= 2) recency = 35
  else if (days <= 5) recency = 28
  else if (days <= 7) recency = 20
  else if (days <= 14) recency = 10
  else if (days <= 21) recency = 5
  else recency = 0

  // 2. Volume Score (0-25)
  let volume: number
  const e30 = client.emails_30d || 0
  if (e30 >= 20) volume = 25
  else if (e30 >= 10) volume = 20
  else if (e30 >= 5) volume = 15
  else if (e30 >= 2) volume = 8
  else if (e30 >= 1) volume = 4
  else volume = 0

  // 3. Trend Score (0-20)
  let trend: number
  let trendDirection: 'up' | 'down' | 'stable' = 'stable'
  const expected7d = (client.emails_30d / 30) * 7
  
  if (expected7d === 0 && client.emails_7d === 0) {
    trend = 5
  } else if (expected7d === 0 && client.emails_7d > 0) {
    trend = 20
    trendDirection = 'up'
  } else {
    const ratio = client.emails_7d / expected7d
    if (ratio >= 1.2) { trend = 20; trendDirection = 'up' }
    else if (ratio >= 0.8) { trend = 15; trendDirection = 'stable' }
    else if (ratio >= 0.5) { trend = 10; trendDirection = 'down' }
    else if (ratio >= 0.25) { trend = 5; trendDirection = 'down' }
    else { trend = 0; trendDirection = 'down' }
  }

  // 4. Multi-Channel Score (0-20)
  let multiChannel: number
  const hasSlack = !!client.slack_channel
  const slackMsgs = client.slack_messages_7d || 0
  
  if (hasSlack && slackMsgs >= 5) multiChannel = 20
  else if (hasSlack && slackMsgs >= 1) multiChannel = 15
  else if (hasSlack) multiChannel = 8
  else multiChannel = 0

  // Calculate total
  const total = recency + volume + trend + multiChannel

  // Determine bracket
  let bracket: HealthScore['bracket']
  if (total >= 71) bracket = 'healthy'
  else if (total >= 41) bracket = 'needs_attention'
  else bracket = 'at_risk'

  return {
    total,
    bracket,
    components: { recency, volume, trend, multiChannel },
    trend: trendDirection
  }
}

// Convert client name to expected Slack channel name
// e.g., "Emily Journey" -> "client-emily-journey"
function clientNameToSlackChannel(clientName: string): string {
  return 'client-' + clientName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// GET - Fetch all client communication stats
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const filter = url.searchParams.get('filter') || 'all'
    
    await ensureTable()

    let query = supabase
      .from('client_communications')
      .select('*')
      .order('days_since_contact', { ascending: false })

    if (filter === 'needs_attention') {
      query = query.gte('days_since_contact', 7)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          communications: [],
          stats: {
            totalClients: 0,
            activeClients: 0,
            needsAttention: 0,
            critical: 0,
            avgDaysSinceContact: 0,
            noEmail7d: 0,
            noSlack7d: 0,
            noContact7d: 0
          },
          message: 'No data yet - run a refresh to populate'
        })
      }
      throw error
    }

    // Calculate stats and add health scores
    const communications = (data || []).map(client => ({
      ...client,
      health_score: calculateHealthScore(client)
    }))
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const noEmail7d = communications.filter(c => 
      !c.last_email_date || new Date(c.last_email_date) < sevenDaysAgo
    ).length

    const noSlack7d = communications.filter(c => 
      !c.last_slack_date || new Date(c.last_slack_date) < sevenDaysAgo
    ).length

    const noContact7d = communications.filter(c => {
      const lastEmail = c.last_email_date ? new Date(c.last_email_date) : null
      const lastSlack = c.last_slack_date ? new Date(c.last_slack_date) : null
      const lastContact = lastEmail && lastSlack 
        ? (lastEmail > lastSlack ? lastEmail : lastSlack)
        : lastEmail || lastSlack
      return !lastContact || lastContact < sevenDaysAgo
    }).length

    // Health distribution
    const healthyCount = communications.filter(c => c.health_score.bracket === 'healthy').length
    const needsAttentionCount = communications.filter(c => c.health_score.bracket === 'needs_attention').length
    const atRiskCount = communications.filter(c => c.health_score.bracket === 'at_risk').length
    const avgHealthScore = communications.length > 0
      ? Math.round(communications.reduce((sum, c) => sum + c.health_score.total, 0) / communications.length)
      : 0
    const totalUnreplied = communications.reduce((sum, c) => sum + (c.unreplied_count || 0), 0)

    const stats = {
      totalClients: communications.length,
      activeClients: communications.filter(c => c.status === 'active').length,
      needsAttention: communications.filter(c => c.days_since_contact >= 7).length,
      critical: communications.filter(c => c.days_since_contact >= 14).length,
      avgDaysSinceContact: communications.length > 0
        ? Math.round(communications.reduce((sum, c) => sum + c.days_since_contact, 0) / communications.length)
        : 0,
      noEmail7d,
      noSlack7d,
      noContact7d,
      // Health stats
      healthyCount,
      needsAttentionCount,
      atRiskCount,
      avgHealthScore,
      totalUnreplied
    }

    return NextResponse.json({
      success: true,
      communications,
      stats
    })

  } catch (error) {
    console.error('Error fetching client communications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client communications' },
      { status: 500 }
    )
  }
}

// POST - Trigger refresh: spawn background script (doesn't block server)
export async function POST(request: Request) {
  try {
    console.log('Spawning background refresh script...')
    
    // Spawn the script in background - doesn't block
    exec('npx tsx scripts/refresh-communications.ts >> /tmp/refresh.log 2>&1 &', {
      cwd: process.cwd(),
    })

    return NextResponse.json({
      success: true,
      message: 'Refresh started in background. Check /tmp/refresh.log for progress.',
    })
  } catch (error) {
    console.error('Error spawning refresh:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start refresh' },
      { status: 500 }
    )
  }
}

// OLD POST - Heavy in-process refresh (can crash server)
export async function POST_DISABLED(request: Request) {
  try {
    await ensureTable()

    console.log('Starting client communication refresh...')

    // Get all clients from Google Sheets
    const clientsResult = await getAllClients()
    if (!clientsResult.success || !clientsResult.clients) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch client list' },
        { status: 500 }
      )
    }

    const clients = clientsResult.clients
    console.log(`Processing ${clients.length} clients...`)

    // Fetch Slack channels once
    console.log('Fetching Slack channels...')
    const slackChannelsResult = await listSlackChannels({ limit: 100 })
    const slackChannels: SlackChannel[] = slackChannelsResult.success 
      ? slackChannelsResult.channels 
      : []
    console.log(`Found ${slackChannels.length} Slack channels`)

    // Build a map of channel names to channel objects
    const channelMap = new Map<string, SlackChannel>()
    for (const channel of slackChannels) {
      channelMap.set(channel.name.toLowerCase(), channel)
    }

    const results: ClientCommunication[] = []
    const insights: Array<{
      client_name: string
      days_since_contact: number
      status: string
      no_email_7d: boolean
      no_slack_7d: boolean
    }> = []

    // Process each client
    for (const client of clients) {
      const clientName = client.name
      console.log(`Checking communications for: ${clientName}`)

      let emails_30d = 0
      let emails_7d = 0
      let lastEmail: Email | null = null
      let lastEmailDate: string | null = null

      // --- Email Processing ---
      try {
        // Search emails for this client (last 30 days)
        const emailResult: EmailResult = await callBridgeKit(
          `bridgekit.search_emails query="${clientName}" days=30`
        )

        // BridgeKit returns 'results' not 'emails'
        const emails = emailResult?.results || emailResult?.emails || []
        if (Array.isArray(emails) && emails.length > 0) {
          emails_30d = emails.length
          
          // Find emails in last 7 days
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          
          for (const email of emails) {
            const emailDate = new Date(email.date || email.timestamp || '')
            if (emailDate >= sevenDaysAgo) {
              emails_7d++
            }
            // Track most recent email
            if (!lastEmail || new Date(email.date || email.timestamp || '') > new Date(lastEmail.date || lastEmail.timestamp || '')) {
              lastEmail = email
              lastEmailDate = email.date || email.timestamp || null
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching emails for ${clientName}:`, error)
      }

      // --- Slack Processing ---
      let slackChannel: string | null = null
      let lastSlackDate: string | null = null
      let slackMessages7d = 0
      let lastSlackFrom: string | null = null

      try {
        const expectedChannelName = clientNameToSlackChannel(clientName)
        const matchedChannel = channelMap.get(expectedChannelName)

        if (matchedChannel) {
          slackChannel = matchedChannel.name
          console.log(`  Found Slack channel: #${slackChannel}`)

          // Fetch channel history (last 7 days, up to 20 messages)
          const historyResult = await getSlackChannelHistory({
            channel: matchedChannel.id,
            limit: '7d',
            includeThreads: false
          })

          if (historyResult.success && historyResult.messages.length > 0) {
            slackMessages7d = historyResult.messages.length

            // Find the most recent message
            const sortedMessages = historyResult.messages.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            const latestMessage = sortedMessages[0]
            lastSlackDate = latestMessage.timestamp
            lastSlackFrom = latestMessage.real_name || latestMessage.username || 'Unknown'
          }
        } else {
          console.log(`  No Slack channel found for ${expectedChannelName}`)
        }
      } catch (error) {
        console.error(`Error fetching Slack for ${clientName}:`, error)
      }

      // --- Calculate combined contact stats ---
      const lastEmailDateObj = lastEmailDate ? new Date(lastEmailDate) : null
      const lastSlackDateObj = lastSlackDate ? new Date(lastSlackDate) : null
      
      // Last contact is the most recent of email or Slack
      let lastContactDate: Date | null = null
      if (lastEmailDateObj && lastSlackDateObj) {
        lastContactDate = lastEmailDateObj > lastSlackDateObj ? lastEmailDateObj : lastSlackDateObj
      } else {
        lastContactDate = lastEmailDateObj || lastSlackDateObj
      }

      const daysSinceContact = lastContactDate 
        ? calculateDaysSince(lastContactDate.toISOString())
        : 999
      const status = getStatus(daysSinceContact)

      const commRecord: ClientCommunication = {
        client_name: clientName,
        platform: client.platform,
        last_email_date: lastEmailDate,
        last_email_subject: lastEmail?.subject || null,
        last_email_from: lastEmail?.from || null,
        emails_7d,
        emails_30d,
        meetings_7d: 0, // TODO: integrate calendar
        unreplied_count: 0, // TODO: calculate unreplied
        days_since_contact: daysSinceContact,
        status,
        updated_at: new Date().toISOString(),
        // Slack fields
        slack_channel: slackChannel,
        last_slack_date: lastSlackDate,
        slack_messages_7d: slackMessages7d,
        last_slack_from: lastSlackFrom
      }

      // Upsert immediately after processing each client (crash-resilient)
      const { error: upsertError } = await supabase
        .from('client_communications')
        .upsert(commRecord, { onConflict: 'client_name' })
      
      if (upsertError) {
        console.error(`Error upserting ${clientName}:`, upsertError)
      } else {
        console.log(`✓ Saved: ${clientName} (${daysSinceContact} days since contact)`)
      }

      results.push(commRecord)

      // Track insights for clients needing attention
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const noEmail7d = !lastEmailDate || new Date(lastEmailDate) < sevenDaysAgo
      const noSlack7d = !lastSlackDate || new Date(lastSlackDate) < sevenDaysAgo

      if (daysSinceContact >= 7 || noEmail7d || noSlack7d) {
        insights.push({
          client_name: clientName,
          days_since_contact: daysSinceContact,
          status,
          no_email_7d: noEmail7d,
          no_slack_7d: noSlack7d
        })
      }
    }

    // Create insights for clients needing attention
    if (insights.length > 0) {
      for (const insight of insights) {
        let title = ''
        let summary = ''

        if (insight.no_email_7d && insight.no_slack_7d) {
          title = `No contact with ${insight.client_name} for ${insight.days_since_contact} days`
          summary = 'No email or Slack activity in the last 7 days'
        } else if (insight.no_email_7d) {
          title = `No email from ${insight.client_name} in 7+ days`
          summary = 'Email communication has gone quiet, but Slack is active'
        } else if (insight.no_slack_7d) {
          title = `No Slack activity for ${insight.client_name} in 7+ days`
          summary = 'Slack channel is quiet, but email is active'
        } else {
          title = `${insight.client_name} may need a check-in`
          summary = insight.status === 'critical' 
            ? `Critical: ${insight.client_name} has not been contacted in over 2 weeks`
            : `Consider reaching out to ${insight.client_name}`
        }

        try {
          await getSupabase().from('daily_insights').insert({
            date: new Date().toISOString().split('T')[0],
            insight_type: 'client_communication',
            client_name: insight.client_name,
            title,
            summary,
            data: { 
              days_since_contact: insight.days_since_contact,
              no_email_7d: insight.no_email_7d,
              no_slack_7d: insight.no_slack_7d
            },
            priority: insight.status === 'critical' ? 'high' : 'normal'
          })
        } catch (insertError) {
          console.log('Insight insert skipped:', insertError)
        }
      }
    }

    console.log(`✓ Processed ${results.length} clients, ${insights.length} need attention`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      needsAttention: insights.length,
      slackChannelsFound: results.filter(r => r.slack_channel).length,
      message: `Updated communication stats for ${results.length} clients`
    })

  } catch (error) {
    console.error('Error refreshing client communications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to refresh client communications' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for processing all clients
