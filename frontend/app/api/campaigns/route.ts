import { NextResponse } from 'next/server'
import { listInstantlyCampaigns } from '@/lib/instantly'
import { listBisonCampaigns } from '@/lib/bison'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('clientName')
    const platform = searchParams.get('platform')

    if (!clientName || !platform) {
      return NextResponse.json(
        { success: false, error: 'Missing clientName or platform' },
        { status: 400 }
      )
    }

    console.log(`Fetching ${platform} campaigns for ${clientName}...`)

    if (platform === 'instantly') {
      const result = await listInstantlyCampaigns({ clientName })

      if (result.success) {
        return NextResponse.json({
          success: true,
          campaigns: result.campaigns
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to fetch Instantly campaigns'
        }, { status: 500 })
      }
    } else if (platform === 'bison') {
      const result = await listBisonCampaigns({ clientName, status: 'all' })

      if (result.success) {
        return NextResponse.json({
          success: true,
          campaigns: result.campaigns
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to fetch Bison campaigns'
        }, { status: 500 })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid platform' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
