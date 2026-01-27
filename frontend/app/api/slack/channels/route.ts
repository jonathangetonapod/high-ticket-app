import { NextRequest, NextResponse } from 'next/server'
import { listSlackChannels } from '@/lib/slack'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const types = searchParams.get('types') || 'public_channel,private_channel'
    const excludeArchived = searchParams.get('excludeArchived') !== 'false'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const result = await listSlackChannels({
      types,
      excludeArchived,
      limit,
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in Slack channels API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Slack channels' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
