import { NextRequest, NextResponse } from 'next/server'
import { listBisonSenderEmails } from '@/lib/bison'

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

    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const result = await listBisonSenderEmails({
      clientName,
      startDate,
      endDate,
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in Bison sender emails API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sender emails' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
