import { NextRequest, NextResponse } from 'next/server'
import { getFathomSummary } from '@/lib/fathom'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const recordingIdParam = searchParams.get('recordingId')

    if (!recordingIdParam) {
      return NextResponse.json(
        { success: false, error: 'Missing recordingId parameter' },
        { status: 400 }
      )
    }

    const recordingId = parseInt(recordingIdParam, 10)
    if (isNaN(recordingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recordingId - must be a number' },
        { status: 400 }
      )
    }

    const result = await getFathomSummary(recordingId)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in Fathom summary API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
