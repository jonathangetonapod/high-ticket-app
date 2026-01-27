// Slack Client - Replicates Python implementation from gmail-reply-tracker-mcp
// Implements list_slack_channels and get_slack_channel_history

const SLACK_API_BASE_URL = 'https://slack.com/api'
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''

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

/**
 * Make authenticated request to Slack API
 * Replicates: SlackClient._make_request() from slack_client.py
 */
async function makeSlackRequest<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  if (!SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN environment variable is not set')
  }

  // Build query string
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, String(value))
  })

  const url = `${SLACK_API_BASE_URL}/${endpoint}?${queryParams.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`)
    }

    const data = await response.json() as { ok: boolean; error?: string }

    if (!data.ok) {
      if (data.error === 'invalid_auth') {
        throw new Error('Invalid Slack token')
      } else if (data.error === 'channel_not_found') {
        throw new Error('Channel not found')
      } else if (data.error === 'ratelimited') {
        throw new Error('Rate limit exceeded')
      } else {
        throw new Error(`Slack API error: ${data.error}`)
      }
    }

    return data as T

  } catch (error) {
    console.error('Error making Slack API request:', error)
    throw error
  }
}

/**
 * List all Slack channels in a workspace
 * Replicates: list_slack_channels() from server.py:11519-11570
 *
 * API Endpoint: conversations.list
 */
export async function listSlackChannels(options: {
  types?: string // "public_channel,private_channel,mpim,im"
  excludeArchived?: boolean
  limit?: number
} = {}): Promise<{
  success: boolean
  channels: SlackChannel[]
  count: number
  error?: string
}> {
  try {
    console.log('Fetching Slack channels...')

    const {
      types = 'public_channel,private_channel',
      excludeArchived = true,
      limit = 100,
    } = options

    const response = await makeSlackRequest<{
      ok: boolean
      channels: Array<{
        id: string
        name: string
        is_channel?: boolean
        is_group?: boolean
        is_im?: boolean
        is_mpim?: boolean
        topic?: { value: string }
        purpose?: { value: string }
        num_members?: number
        is_member?: boolean
        is_archived?: boolean
      }>
    }>('conversations.list', {
      types,
      exclude_archived: excludeArchived,
      limit,
    })

    const channels: SlackChannel[] = response.channels.map(ch => {
      // Determine channel type
      let type = 'unknown'
      if (ch.is_channel) type = 'public_channel'
      else if (ch.is_group) type = 'private_channel'
      else if (ch.is_mpim) type = 'mpim'
      else if (ch.is_im) type = 'im'

      return {
        id: ch.id,
        name: ch.name || '',
        type,
        topic: ch.topic?.value || '',
        purpose: ch.purpose?.value || '',
        member_count: ch.num_members || 0,
        is_member: ch.is_member || false,
        is_archived: ch.is_archived || false,
      }
    })

    console.log(`✓ Loaded ${channels.length} channels`)

    return {
      success: true,
      channels,
      count: channels.length,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in listSlackChannels:', errorMsg)

    return {
      success: false,
      channels: [],
      count: 0,
      error: errorMsg,
    }
  }
}

/**
 * Parse smart limit string to oldest timestamp
 * Replicates: parse_limit() from server.py
 */
function parseLimit(limit: string): { oldest?: number; limit?: number } {
  // Time-based: "7d", "2w", "1m"
  const timeMatch = limit.match(/^(\d+)([dwm])$/)
  if (timeMatch) {
    const value = parseInt(timeMatch[1], 10)
    const unit = timeMatch[2]

    let seconds = 0
    if (unit === 'd') seconds = value * 24 * 60 * 60
    else if (unit === 'w') seconds = value * 7 * 24 * 60 * 60
    else if (unit === 'm') seconds = value * 30 * 24 * 60 * 60

    const oldest = Math.floor((Date.now() - seconds * 1000) / 1000)
    return { oldest }
  }

  // Count-based: "50"
  const count = parseInt(limit, 10)
  if (!isNaN(count)) {
    return { limit: count }
  }

  // Default to 7 days
  const defaultOldest = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
  return { oldest: defaultOldest }
}

/**
 * Get message history from a Slack channel
 * Replicates: get_slack_channel_history() from server.py:11573-11640
 *
 * API Endpoint: conversations.history
 */
export async function getSlackChannelHistory(options: {
  channel: string // Channel ID or #name
  limit?: string // "7d", "2w", "1m", or "50" (count)
  includeThreads?: boolean
}): Promise<{
  success: boolean
  channel: string
  channel_id: string
  channel_name: string
  messages: SlackMessage[]
  count: number
  has_more: boolean
  error?: string
}> {
  try {
    const {
      channel,
      limit: limitStr = '7d',
      includeThreads = false,
    } = options

    console.log(`Fetching Slack channel history for ${channel}...`)

    // Parse limit to oldest timestamp or message count
    const { oldest, limit: messageLimit } = parseLimit(limitStr)

    // If channel starts with #, need to resolve to channel ID
    let channelId = channel
    let channelName = channel

    if (channel.startsWith('#')) {
      // Remove # and find channel by name
      const searchName = channel.substring(1)
      const channelsResult = await listSlackChannels()

      if (!channelsResult.success) {
        throw new Error('Failed to list channels')
      }

      const foundChannel = channelsResult.channels.find(
        ch => ch.name.toLowerCase() === searchName.toLowerCase()
      )

      if (!foundChannel) {
        throw new Error(`Channel ${channel} not found`)
      }

      channelId = foundChannel.id
      channelName = foundChannel.name
    }

    // Fetch channel history
    const params: Record<string, string | number> = {
      channel: channelId,
    }

    if (oldest) params.oldest = oldest
    if (messageLimit) params.limit = messageLimit

    const response = await makeSlackRequest<{
      ok: boolean
      messages: Array<{
        ts: string
        user?: string
        text?: string
        thread_ts?: string
        reply_count?: number
        reactions?: any[]
      }>
      has_more: boolean
    }>('conversations.history', params)

    // Fetch user info for message authors
    const userIds = new Set<string>()
    response.messages.forEach(msg => {
      if (msg.user) userIds.add(msg.user)
    })

    // Build user map (simplified - in production would batch fetch)
    const userMap = new Map<string, { username: string; real_name: string }>()
    for (const userId of userIds) {
      try {
        const userInfo = await makeSlackRequest<{
          ok: boolean
          user: {
            name: string
            real_name: string
          }
        }>('users.info', { user: userId })

        userMap.set(userId, {
          username: userInfo.user.name,
          real_name: userInfo.user.real_name,
        })
      } catch (err) {
        // If user fetch fails, use placeholder
        userMap.set(userId, { username: userId, real_name: 'Unknown User' })
      }
    }

    // Format messages
    const messages: SlackMessage[] = response.messages.map(msg => {
      const user = msg.user ? userMap.get(msg.user) : null
      const timestamp = new Date(parseFloat(msg.ts) * 1000).toISOString()

      return {
        ts: msg.ts,
        user_id: msg.user || '',
        username: user?.username || '',
        real_name: user?.real_name || '',
        text: msg.text || '',
        thread_ts: msg.thread_ts,
        reply_count: msg.reply_count,
        reactions: msg.reactions,
        timestamp,
      }
    })

    console.log(`✓ Loaded ${messages.length} messages`)

    return {
      success: true,
      channel,
      channel_id: channelId,
      channel_name: channelName,
      messages,
      count: messages.length,
      has_more: response.has_more,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getSlackChannelHistory:', errorMsg)

    return {
      success: false,
      channel: options.channel,
      channel_id: '',
      channel_name: '',
      messages: [],
      count: 0,
      has_more: false,
      error: errorMsg,
    }
  }
}
