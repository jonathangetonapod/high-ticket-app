import { NextRequest, NextResponse } from 'next/server'
import { listInstantlySenderEmails } from '@/lib/instantly'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientName = searchParams.get('clientName')

    if (!clientName) {
      return NextResponse.json(
        { success: false, error: 'Missing clientName parameter' },
        { status: 400 }
      )
    }

    const result = await listInstantlySenderEmails({ clientName })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in Instantly sender emails API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sender emails' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
