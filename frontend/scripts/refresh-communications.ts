#!/usr/bin/env npx tsx
/**
 * Standalone script to refresh client communications
 * Run with: npx tsx scripts/refresh-communications.ts
 */

import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Load env
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Email {
  id: string
  from: string
  subject: string
  date: string
  snippet?: string
  thread_id?: string
}

interface SlackChannel {
  id: string
  name: string
  type: string
}

interface SlackMessage {
  user: string
  text: string
  ts: string
  date?: string
}

// Cache for Slack channels (loaded once)
let slackChannelsCache: SlackChannel[] | null = null
let slackMappingsCache: Map<string, { channel_id: string; channel_name: string }> | null = null

async function loadSlackChannels(): Promise<SlackChannel[]> {
  if (slackChannelsCache) return slackChannelsCache
  
  console.log('📱 Loading Slack channels...')
  const result = await callBridgeKit('bridgekit.list_slack_channels')
  if (result?.channels?.channels) {
    const channels = result.channels.channels.filter(
      (c: SlackChannel) => c.name.startsWith('client-')
    )
    slackChannelsCache = channels
    console.log(`  ✓ Found ${channels.length} client channels`)
    return channels
  }
  return []
}

// Load manual Slack channel mappings from database
async function loadSlackMappings(): Promise<Map<string, { channel_id: string; channel_name: string }>> {
  if (slackMappingsCache) return slackMappingsCache
  
  console.log('🔗 Loading manual Slack mappings...')
  const { data, error } = await supabase
    .from('slack_channel_mappings')
    .select('client_name, slack_channel_id, slack_channel_name')
  
  slackMappingsCache = new Map()
  if (data && !error) {
    for (const mapping of data) {
      slackMappingsCache.set(mapping.client_name.toLowerCase(), {
        channel_id: mapping.slack_channel_id,
        channel_name: mapping.slack_channel_name
      })
    }
    console.log(`  ✓ Found ${slackMappingsCache.size} manual mappings`)
  }
  return slackMappingsCache
}

function findSlackChannel(
  clientName: string, 
  channels: SlackChannel[],
  mappings: Map<string, { channel_id: string; channel_name: string }>
): SlackChannel | null {
  // 1. Check manual mapping first
  const manualMapping = mappings.get(clientName.toLowerCase())
  if (manualMapping) {
    const mapped = channels.find(c => c.id === manualMapping.channel_id)
    if (mapped) return mapped
    // If channel not in list, create a fake one with the mapping data
    return { id: manualMapping.channel_id, name: manualMapping.channel_name, type: 'private_channel' }
  }
  
  // 2. Convert "John Smith" to "client-john-smith"
  const expectedName = 'client-' + clientName.toLowerCase().replace(/\s+/g, '-')
  
  // Try exact match
  let channel = channels.find(c => c.name === expectedName)
  if (channel) return channel
  
  // 3. Try fuzzy match (first name only)
  const firstName = clientName.split(' ')[0].toLowerCase()
  channel = channels.find(c => c.name.includes(firstName))
  
  return channel || null
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

// Load client context for email addresses
async function loadClientContexts(): Promise<Map<string, { email?: string; slackChannelId?: string; slackChannelName?: string }>> {
  console.log('📧 Loading client contexts...')
  const { data, error } = await supabase
    .from('client_context')
    .select('client_id, client_email, slack_channel_id, slack_channel_name')
  
  const contexts = new Map()
  if (data && !error) {
    for (const ctx of data) {
      // client_id is slugified, need to match to client_name
      contexts.set(ctx.client_id, {
        email: ctx.client_email,
        slackChannelId: ctx.slack_channel_id,
        slackChannelName: ctx.slack_channel_name
      })
    }
    console.log(`  ✓ Found ${contexts.size} client contexts with settings`)
  }
  return contexts
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function main() {
  console.log('🚀 Starting client communication refresh...')
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

  // Load Slack channels, manual mappings, and client contexts
  const slackChannels = await loadSlackChannels()
  const slackMappings = await loadSlackMappings()
  const clientContexts = await loadClientContexts()

  // Get clients from existing table
  const { data: existingClients, error: fetchError } = await supabase
    .from('client_communications')
    .select('client_name, platform')
  
  if (fetchError) {
    console.error('Error fetching clients:', fetchError)
    return
  }

  const clients = existingClients || []
  console.log(`📋 Found ${clients.length} clients to process`)

  let processed = 0
  let withEmails = 0
  let withSlack = 0

  for (const client of clients) {
    const clientName = client.client_name
    console.log(`\n[${processed + 1}/${clients.length}] Processing: ${clientName}`)

    let emails_30d = 0
    let emails_7d = 0
    let lastEmail: Email | null = null
    let lastEmailDate: string | null = null
    let recentEmails: any[] = []
    let recentSenders: string[] = []
    let emailSnippet: string | null = null

    // Get client context (email, slack settings)
    const clientSlug = slugify(clientName)
    const clientCtx = clientContexts.get(clientSlug)
    
    // Search emails - use client email if available, otherwise name
    try {
      const searchQuery = clientCtx?.email || clientName
      const searchType = clientCtx?.email ? '📧' : '👤'
      
      let emailResult = await callBridgeKit(
        `bridgekit.search_emails query="${searchQuery}" days=30`
      )

      let emails: Email[] = emailResult?.results || emailResult?.emails || []
      
      // If no results and we used email, try name as fallback
      if (emails.length === 0 && clientCtx?.email) {
        console.log(`  🔍 Email search empty, trying name: "${clientName}"`)
        emailResult = await callBridgeKit(
          `bridgekit.search_emails query="${clientName}" days=30`
        )
        emails = emailResult?.results || emailResult?.emails || []
      }
      
      // If no results, try fuzzy matching with first name
      if (emails.length === 0) {
        const firstName = clientName.split(' ')[0]
        const lastName = clientName.split(' ').slice(1).join(' ')
        
        // Try first name + partial last name (first 4 chars)
        if (lastName.length > 4) {
          const partialLast = lastName.substring(0, 4)
          console.log(`  🔍 Trying fuzzy: "${firstName} ${partialLast}"`)
          emailResult = await callBridgeKit(
            `bridgekit.search_emails query="${firstName} ${partialLast}" days=30`
          )
          emails = emailResult?.results || emailResult?.emails || []
        }
        
        // If still no results, try just first name
        if (emails.length === 0 && firstName.length > 2) {
          console.log(`  🔍 Trying first name only: "${firstName}"`)
          emailResult = await callBridgeKit(
            `bridgekit.search_emails query="${firstName}" days=30`
          )
          emails = emailResult?.results || emailResult?.emails || []
        }
      }
      
      if (Array.isArray(emails) && emails.length > 0) {
        emails_30d = emails.length
        withEmails++
        
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        // Sort by date descending
        const sortedEmails = emails.sort((a, b) => 
          new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
        )
        
        // Get recent emails (top 5 with full details)
        recentEmails = sortedEmails.slice(0, 5).map(e => ({
          from: e.from,
          subject: e.subject,
          date: e.date,
          snippet: e.snippet?.substring(0, 200) || ''
        }))
        
        // Get unique senders (top 5)
        const senderSet = new Set<string>()
        for (const email of sortedEmails) {
          if (email.from && senderSet.size < 5) {
            senderSet.add(email.from)
          }
        }
        recentSenders = Array.from(senderSet)
        
        for (const email of emails) {
          const emailDate = new Date(email.date || '')
          if (emailDate >= sevenDaysAgo) {
            emails_7d++
          }
          if (!lastEmail || new Date(email.date || '') > new Date(lastEmail.date || '')) {
            lastEmail = email
            lastEmailDate = email.date || null
            emailSnippet = email.snippet?.substring(0, 300) || null
          }
        }
        console.log(`  ✓ Found ${emails_30d} emails (${emails_7d} in 7d, ${recentSenders.length} senders)`)
      } else {
        console.log(`  - No emails found`)
      }
    } catch (error) {
      console.error(`  ✗ Error:`, error)
    }

    // Check Slack channel
    let slackChannel: string | null = null
    let lastSlackDate: string | null = null
    let lastSlackFrom: string | null = null
    let slackMessages7d = 0

    // Check client context for Slack channel first, then use findSlackChannel
    let channel: SlackChannel | null = null
    if (clientCtx?.slackChannelId) {
      channel = slackChannels.find(c => c.id === clientCtx.slackChannelId) || 
        { id: clientCtx.slackChannelId, name: clientCtx.slackChannelName || 'configured', type: 'private' }
      console.log(`  🔗 Using configured Slack: #${channel.name}`)
    } else {
      channel = findSlackChannel(clientName, slackChannels, slackMappings)
    }
    if (channel) {
      slackChannel = channel.name
      try {
        const historyResult = await callBridgeKit(
          `bridgekit.get_slack_channel_history channel="${channel.id}" days=7`
        )
        const messages: SlackMessage[] = historyResult?.messages || []
        if (messages.length > 0) {
          slackMessages7d = messages.length
          withSlack++
          // Get most recent message
          const sorted = messages.sort((a, b) => 
            parseFloat(b.ts) - parseFloat(a.ts)
          )
          if (sorted[0]) {
            lastSlackDate = new Date(parseFloat(sorted[0].ts) * 1000).toISOString()
            lastSlackFrom = sorted[0].user || null
          }
          console.log(`  💬 Slack: ${slackMessages7d} messages in 7d (${channel.name})`)
        } else {
          console.log(`  💬 Slack: channel found but no recent messages (${channel.name})`)
        }
      } catch (error) {
        console.error(`  ✗ Slack error:`, error)
      }
    }

    // Calculate stats - use most recent of email or slack
    const emailDays = calculateDaysSince(lastEmailDate)
    const slackDays = calculateDaysSince(lastSlackDate)
    const daysSinceContact = Math.min(emailDays, slackDays)
    const status = getStatus(daysSinceContact)

    // Upsert immediately - store extended data in last_email_from as JSON if available
    const extendedFrom = recentEmails.length > 0 
      ? JSON.stringify({ 
          from: lastEmail?.from,
          senders: recentSenders.slice(0, 3),
          snippet: emailSnippet?.substring(0, 150),
          recent: recentEmails.slice(0, 3).map(e => ({
            subject: e.subject.substring(0, 60),
            from: e.from.split('<')[0].trim().substring(0, 30),
            date: e.date,
            snippet: e.snippet?.substring(0, 100)
          }))
        })
      : lastEmail?.from || null

    const { error: upsertError } = await supabase
      .from('client_communications')
      .upsert({
        client_name: clientName,
        platform: client.platform,
        last_email_date: lastEmailDate,
        last_email_subject: lastEmail?.subject || null,
        last_email_from: extendedFrom,
        emails_7d,
        emails_30d,
        days_since_contact: daysSinceContact,
        status,
        updated_at: new Date().toISOString(),
        // Slack fields
        slack_channel: slackChannel,
        last_slack_date: lastSlackDate,
        slack_messages_7d: slackMessages7d,
        last_slack_from: lastSlackFrom,
      }, { onConflict: 'client_name' })

    if (upsertError) {
      console.error(`  ✗ Upsert error:`, upsertError.message)
    } else {
      console.log(`  💾 Saved (${daysSinceContact}d since contact, status: ${status})`)
    }

    processed++
  }

  console.log(`\n✅ Done! Processed ${processed} clients, ${withEmails} had emails, ${withSlack} had Slack activity`)
}

main().catch(console.error)
