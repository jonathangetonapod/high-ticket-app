import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { UpdateBestPracticeSchema } from '@/lib/validations/best-practice'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response'
import { requireAuth, requireAdmin, handleAuthError } from '@/lib/session'

interface Guide {
  id: string
  title: string
  category: string
  content: string
  updatedAt: string
}

interface BestPracticeRow {
  id: string
  title: string
  category: string
  content: string
  updated_at: string
}

// GET - Get single guide (requires auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication to view guides
    await requireAuth()

    const { id } = await params
    const supabase = createServerClient()
    
    const { data, error } = await (supabase as any)
      .from('best_practices')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return errorResponse('Guide not found', 404)
    }

    const row = data as BestPracticeRow
    const guide: Guide = {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      updatedAt: row.updated_at
    }

    return successResponse({ guide })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error reading guide:', error)
    return errorResponse('Failed to load guide', 500)
  }
}

// PUT - Update guide (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin access for updating guides
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    
    // Validate with Zod
    const result = UpdateBestPracticeSchema.safeParse(body)
    
    if (!result.success) {
      return validationErrorResponse(result.error)
    }

    const { title, category, content } = result.data
    
    const supabase = createServerClient()

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    
    if (title) updateData.title = title
    if (category) updateData.category = category
    if (content) updateData.content = content

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('best_practices') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return errorResponse('Guide not found', 404)
      }
      console.error('Error updating guide:', error)
      return errorResponse('Failed to update guide', 500)
    }

    const row = data as BestPracticeRow
    const guide: Guide = {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      updatedAt: row.updated_at
    }

    return successResponse({ guide })

  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error updating guide:', error)
    return errorResponse('Failed to update guide', 500)
  }
}

// DELETE - Delete guide (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin access for deleting guides
    await requireAdmin()

    const { id } = await params
    const supabase = createServerClient()

    // First check if guide exists
    const { data: existing } = await (supabase as any)
      .from('best_practices')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse('Guide not found', 404)
    }

    const { error } = await (supabase as any)
      .from('best_practices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting guide:', error)
      return errorResponse('Failed to delete guide', 500)
    }

    return successResponse({ deleted: true })

  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error deleting guide:', error)
    return errorResponse('Failed to delete guide', 500)
  }
}
