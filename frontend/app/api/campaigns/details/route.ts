import { NextRequest, NextResponse } from 'next/server'
import { getInstantlyCampaignDetails } from '@/lib/instantly'
import { getBisonCampaignDetails } from '@/lib/bison'

/**
 * Get detailed campaign information including email sequences
 *
 * Query params:
 * - clientName: Name of the client
 * - campaignId: Campaign ID (integer for Bison, UUID for Instantly)
 * - campaignName: Campaign name (optional, used for Bison)
 * - platform: 'bison' or 'instantly'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientName = searchParams.get('clientName')
    const campaignId = searchParams.get('campaignId')
    const campaignName = searchParams.get('campaignName')
    const platform = searchParams.get('platform')

    if (!clientName || !campaignId || !platform) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: clientName, campaignId, platform' },
        { status: 400 }
      )
    }

    console.log(`Fetching ${platform} campaign details for ${campaignId}...`)

    if (platform === 'instantly') {
      const result = await getInstantlyCampaignDetails({ clientName, campaignId })

      if (result.success) {
        return NextResponse.json({
          success: true,
          campaign_id: result.campaign_id,
          campaign_name: result.campaign_name,
          platform: result.platform,
          sequences: result.sequences
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to fetch Instantly campaign details'
        }, { status: 500 })
      }
    } else if (platform === 'bison') {
      const result = await getBisonCampaignDetails({
        clientName,
        campaignId,
        campaignName: campaignName || undefined
      })

      if (result.success) {
        return NextResponse.json({
          success: true,
          campaign_id: result.campaign_id,
          campaign_name: result.campaign_name,
          platform: result.platform,
          sequences: result.sequences
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to fetch Bison campaign details'
        }, { status: 500 })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid platform' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error fetching campaign details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign details' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
