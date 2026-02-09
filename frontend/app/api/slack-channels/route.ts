import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface SlackChannel {
  id: string
  name: string
  type: string
  member_count: number
}

// In-memory cache
let cachedChannels: SlackChannel[] = []
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function callBridgeKit(command: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`mcporter call ${command}`, {
      timeout: 60000,
    })
    return JSON.parse(stdout)
  } catch (error: any) {
    console.error(`BridgeKit error:`, error.message)
    return null
  }
}

async function fetchChannelsFromSlack(): Promise<SlackChannel[]> {
  const result = await callBridgeKit('bridgekit.list_slack_channels')
  
  if (!result?.channels?.channels) {
    return []
  }

  // Filter to only client channels and format
  return result.channels.channels
    .filter((c: any) => c.name.startsWith('client-'))
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      member_count: c.member_count
    }))
    .sort((a: SlackChannel, b: SlackChannel) => a.name.localeCompare(b.name))
}

// GET - Fetch channels (from cache or Slack)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'
    
    // Check cache
    const now = Date.now()
    if (!forceRefresh && cachedChannels.length > 0 && (now - cacheTime) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        channels: cachedChannels,
        count: cachedChannels.length,
        cached: true
      })
    }

    // Fetch fresh
    console.log('Fetching Slack channels from BridgeKit...')
    const channels = await fetchChannelsFromSlack()
    
    // Update cache
    cachedChannels = channels
    cacheTime = now

    return NextResponse.json({
      success: true,
      channels,
      count: channels.length,
      cached: false
    })
  } catch (error) {
    console.error('Error fetching Slack channels:', error)
    // Return cached data if available, even on error
    if (cachedChannels.length > 0) {
      return NextResponse.json({
        success: true,
        channels: cachedChannels,
        count: cachedChannels.length,
        cached: true,
        warning: 'Using cached data due to fetch error'
      })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch channels', channels: [] },
      { status: 500 }
    )
  }
}

// POST - Force refresh (same as GET with refresh=true)
export async function POST() {
  try {
    console.log('Force refreshing Slack channels...')
    const channels = await fetchChannelsFromSlack()
    
    // Update cache
    cachedChannels = channels
    cacheTime = Date.now()

    return NextResponse.json({
      success: true,
      channels,
      count: channels.length,
      refreshed: true
    })
  } catch (error) {
    console.error('Error refreshing Slack channels:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to refresh channels' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
