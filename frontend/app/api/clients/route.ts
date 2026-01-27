import { NextResponse } from 'next/server'
import { getAllClients } from '@/lib/sheets'

export async function GET() {
  try {
    console.log('Fetching clients from Google Sheets...')

    // Fetch from real Google Sheet (same one used by BridgeKit MCP)
    const result = await getAllClients()

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    console.log(`✓ Loaded ${result.total} clients (${result.instantly_count} Instantly, ${result.bison_count} Bison)`)

    return NextResponse.json({
      success: true,
      clients: result.clients,
      total: result.total,
      instantly_count: result.instantly_count,
      bison_count: result.bison_count,
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// Set runtime to nodejs (required for fetch with no-store cache)
export const runtime = 'nodejs'

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0
