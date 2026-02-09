import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface Guide {
  id: string
  title: string
  category: string
  content: string
  updatedAt: string
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

// GET - List all guides
export async function GET() {
  try {
    const supabase = createServerClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('best_practices') as any)
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true })
    
    if (error) {
      console.error('Error reading guides:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to load guides' },
        { status: 500 }
      )
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
    
    return NextResponse.json({
      success: true,
      guides
    })
  } catch (error) {
    console.error('Error reading guides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load guides' },
      { status: 500 }
    )
  }
}

// POST - Create new guide (admin only)
export async function POST(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { title, category, content } = await request.json()

    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: 'Title, category, and content are required' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { success: false, error: 'Failed to create guide' },
        { status: 500 }
      )
    }

    const guide: Guide = {
      id: data.id,
      title: data.title,
      category: data.category,
      content: data.content,
      updatedAt: data.updated_at
    }

    return NextResponse.json({ success: true, guide })

  } catch (error) {
    console.error('Error creating guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create guide' },
      { status: 500 }
    )
  }
}
