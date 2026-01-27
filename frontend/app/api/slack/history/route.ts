import { NextRequest, NextResponse } from 'next/server'
import { getSlackChannelHistory } from '@/lib/slack'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const channel = searchParams.get('channel')

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Missing channel parameter' },
        { status: 400 }
      )
    }

    const limit = searchParams.get('limit') || '7d'
    const includeThreads = searchParams.get('includeThreads') === 'true'

    const result = await getSlackChannelHistory({
      channel,
      limit,
      includeThreads,
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in Slack history API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch channel history' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
