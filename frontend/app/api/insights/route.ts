import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const getSupabase = () => createServerClient()

// Ensure table exists (best effort - table should be created via migration)
async function ensureTable() {
  try {
    await getSupabase().rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS daily_insights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          date DATE NOT NULL,
          insight_type TEXT NOT NULL,
          client_id TEXT,
          client_name TEXT,
          platform TEXT,
          title TEXT NOT NULL,
          summary TEXT,
          data JSONB DEFAULT '{}',
          priority TEXT DEFAULT 'normal',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_daily_insights_date ON daily_insights(date DESC);
      `
    })
  } catch {
    // RPC might not exist, that's ok - table should exist via migration
    try {
      await getSupabase().from('daily_insights').select('id').limit(1)
    } catch {
      // Table doesn't exist yet, will be created on first insert
    }
  }
}

// GET - Fetch insights
export async function GET(request: Request) {
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const type = url.searchParams.get('type')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const days = parseInt(url.searchParams.get('days') || '7')

  try {
    let query = supabase
      .from('daily_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (date) {
      query = query.eq('date', date)
    } else {
      // Default to last N days
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte('date', startDate.toISOString().split('T')[0])
    }

    if (type) {
      query = query.eq('insight_type', type)
    }

    const { data, error } = await query

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ 
          success: true, 
          insights: [],
          message: 'No insights yet - table will be created on first daily run'
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      insights: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insights', insights: [] },
      { status: 500 }
    )
  }
}

// POST - Add new insight (called by agent)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const insight = {
      date: body.date || new Date().toISOString().split('T')[0],
      insight_type: body.insight_type || body.type,
      client_id: body.client_id,
      client_name: body.client_name,
      platform: body.platform,
      title: body.title,
      summary: body.summary,
      data: body.data || {},
      priority: body.priority || 'normal'
    }

    const { data, error } = await supabase
      .from('daily_insights')
      .insert(insight)
      .select()
      .single()

    if (error) {
      // If table doesn't exist, create it
      if (error.code === '42P01') {
        await ensureTable()
        // Retry insert
        const { data: retryData, error: retryError } = await supabase
          .from('daily_insights')
          .insert(insight)
          .select()
          .single()
        
        if (retryError) throw retryError
        return NextResponse.json({ success: true, insight: retryData })
      }
      throw error
    }

    return NextResponse.json({ success: true, insight: data })
  } catch (error) {
    console.error('Error creating insight:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create insight' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
