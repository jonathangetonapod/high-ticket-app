import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface ClientContext {
  clientId: string
  clientName: string
  icpSummary: string
  specialRequirements: string
  transcriptNotes: string
  updatedAt: string
  // Communication tracking
  clientEmail?: string
  slackChannelId?: string
  slackChannelName?: string
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const clientId = slugify(decodeURIComponent(id))
    
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('client_context')
      .select('*')
      .eq('client_id', clientId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is fine, just means no context yet)
      console.error('Error reading client context:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to read client context' },
        { status: 500 }
      )
    }
    
    if (!data) {
      // Return empty template for new client
      const emptyContext: ClientContext = {
        clientId: clientId,
        clientName: decodeURIComponent(id),
        icpSummary: '',
        specialRequirements: '',
        transcriptNotes: '',
        updatedAt: '',
        clientEmail: '',
        slackChannelId: '',
        slackChannelName: ''
      }
      
      return NextResponse.json({
        success: true,
        context: emptyContext,
        isNew: true
      })
    }
    
    // Transform database row to ClientContext
    const context: ClientContext = {
      clientId: data.client_id,
      clientName: data.client_name,
      icpSummary: data.icp_summary || '',
      specialRequirements: data.special_requirements || '',
      transcriptNotes: data.transcript_notes || '',
      updatedAt: data.updated_at || '',
      clientEmail: data.client_email || '',
      slackChannelId: data.slack_channel_id || '',
      slackChannelName: data.slack_channel_name || ''
    }
    
    return NextResponse.json({
      success: true,
      context
    })
  } catch (error) {
    console.error('Error reading client context:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to read client context' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const clientId = slugify(decodeURIComponent(id))
    const body = await request.json()
    
    const supabase = createServerClient()
    
    const contextData = {
      client_id: clientId,
      client_name: body.clientName || decodeURIComponent(id),
      icp_summary: body.icpSummary || '',
      special_requirements: body.specialRequirements || '',
      transcript_notes: body.transcriptNotes || '',
      updated_at: new Date().toISOString(),
      // Communication tracking fields
      client_email: body.clientEmail || '',
      slack_channel_id: body.slackChannelId || '',
      slack_channel_name: body.slackChannelName || ''
    }
    
    const { data, error } = await supabase
      .from('client_context')
      .upsert(contextData, { onConflict: 'client_id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving client context:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save client context' },
        { status: 500 }
      )
    }
    
    const context: ClientContext = {
      clientId: data.client_id,
      clientName: data.client_name,
      icpSummary: data.icp_summary || '',
      specialRequirements: data.special_requirements || '',
      transcriptNotes: data.transcript_notes || '',
      updatedAt: data.updated_at || '',
      clientEmail: data.client_email || '',
      slackChannelId: data.slack_channel_id || '',
      slackChannelName: data.slack_channel_name || ''
    }
    
    return NextResponse.json({
      success: true,
      context
    })
  } catch (error) {
    console.error('Error saving client context:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save client context' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const clientId = slugify(decodeURIComponent(id))
    
    const supabase = createServerClient()
    
    const { error } = await supabase
      .from('client_context')
      .delete()
      .eq('client_id', clientId)
    
    if (error) {
      console.error('Error deleting client context:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete client context' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client context:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client context' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
