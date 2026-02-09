import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

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

// Check if user is admin
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')
    if (!session?.value) return false
    
    const user = JSON.parse(Buffer.from(session.value, 'base64').toString())
    return user.role === 'admin'
  } catch {
    return false
  }
}

// GET - Get single guide
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('best_practices')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Guide not found' },
        { status: 404 }
      )
    }

    const row = data as BestPracticeRow
    const guide: Guide = {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      updatedAt: row.updated_at
    }

    return NextResponse.json({ success: true, guide })
  } catch (error) {
    console.error('Error reading guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load guide' },
      { status: 500 }
    )
  }
}

// PUT - Update guide (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const { title, category, content } = await request.json()
    
    const supabase = createServerClient()

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    
    if (title) updateData.title = title
    if (category) updateData.category = category
    if (content) updateData.content = content

    const { data, error } = await supabase
      .from('best_practices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Guide not found' },
          { status: 404 }
        )
      }
      console.error('Error updating guide:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update guide' },
        { status: 500 }
      )
    }

    const row = data as BestPracticeRow
    const guide: Guide = {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      updatedAt: row.updated_at
    }

    return NextResponse.json({ success: true, guide })

  } catch (error) {
    console.error('Error updating guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update guide' },
      { status: 500 }
    )
  }
}

// DELETE - Delete guide (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const supabase = createServerClient()

    // First check if guide exists
    const { data: existing } = await supabase
      .from('best_practices')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Guide not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('best_practices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting guide:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete guide' },
      { status: 500 }
    )
  }
}
