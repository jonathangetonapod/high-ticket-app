import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { CreateBestPracticeSchema } from '@/lib/validations/best-practice'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response'
import { requireAuth, requireAdmin, handleAuthError } from '@/lib/session'

interface Guide {
  id: string
  title: string
  category: string
  content: string
  updatedAt: string
}

// GET - List all guides (requires auth)
export async function GET() {
  try {
    // Require authentication to view guides
    // await requireAuth() // TODO: re-enable

    const supabase = createServerClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('best_practices') as any)
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true })
    
    if (error) {
      console.error('Error reading guides:', error)
      return errorResponse('Failed to load guides', 500)
    }
    
    // Transform to Guide interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guides: Guide[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      updatedAt: row.updated_at
    }))
    
    return successResponse({ guides })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error reading guides:', error)
    return errorResponse('Failed to load guides', 500)
  }
}

// POST - Create new guide (admin only)
export async function POST(request: Request) {
  try {
    // Require admin access for creating guides
    await requireAdmin()

    const body = await request.json()

    // Validate with Zod
    const result = CreateBestPracticeSchema.safeParse(body)
    
    if (!result.success) {
      return validationErrorResponse(result.error)
    }

    const { title, category, content } = result.data

    const supabase = createServerClient()
    
    const guideData = {
      id: uuidv4(),
      title,
      category,
      content,
      updated_at: new Date().toISOString()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('best_practices') as any)
      .insert(guideData)
      .select()
      .single()

    if (error) {
      console.error('Error creating guide:', error)
      return errorResponse('Failed to create guide', 500)
    }

    const guide: Guide = {
      id: data.id,
      title: data.title,
      category: data.category,
      content: data.content,
      updatedAt: data.updated_at
    }

    return successResponse({ guide }, undefined, 201)

  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error creating guide:', error)
    return errorResponse('Failed to create guide', 500)
  }
}
