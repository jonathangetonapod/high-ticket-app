import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ClientContextSchema } from '@/lib/validations/client-context'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response'
import { requireAuth, handleAuthError } from '@/lib/session'

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
    // Require authentication
    await requireAuth()

    const { id } = await params
    const clientId = slugify(decodeURIComponent(id))
    
    const supabase = createServerClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('client_context') as any)
      .select('*')
      .eq('client_id', clientId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is fine, just means no context yet)
      console.error('Error reading client context:', error)
      return errorResponse('Failed to read client context', 500)
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
      
      return successResponse({ context: emptyContext, isNew: true })
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
    
    return successResponse({ context })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error reading client context:', error)
    return errorResponse('Failed to read client context', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth()

    const { id } = await params
    const clientId = slugify(decodeURIComponent(id))
    const body = await request.json()
    
    // Validate with Zod
    const result = ClientContextSchema.safeParse(body)
    
    if (!result.success) {
      return validationErrorResponse(result.error)
    }

    const validatedData = result.data
    
    const supabase = createServerClient()
    
    const contextData = {
      client_id: clientId,
      client_name: validatedData.clientName || decodeURIComponent(id),
      icp_summary: validatedData.icpSummary || '',
      special_requirements: validatedData.specialRequirements || '',
      transcript_notes: validatedData.transcriptNotes || '',
      updated_at: new Date().toISOString(),
      // Communication tracking fields
      client_email: validatedData.clientEmail || '',
      slack_channel_id: validatedData.slackChannelId || '',
      slack_channel_name: validatedData.slackChannelName || ''
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('client_context') as any)
      .upsert(contextData, { onConflict: 'client_id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving client context:', error)
      return errorResponse('Failed to save client context', 500)
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
    
    return successResponse({ context })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error saving client context:', error)
    return errorResponse('Failed to save client context', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth()

    const { id } = await params
    const clientId = slugify(decodeURIComponent(id))
    
    const supabase = createServerClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase
      .from('client_context') as any)
      .delete()
      .eq('client_id', clientId)
    
    if (error) {
      console.error('Error deleting client context:', error)
      return errorResponse('Failed to delete client context', 500)
    }
    
    return successResponse({ deleted: true })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error deleting client context:', error)
    return errorResponse('Failed to delete client context', 500)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
