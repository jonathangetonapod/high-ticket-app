import { NextResponse } from 'next/server'
import { listRequirements, createRequirement } from '@/lib/requirements'
import { cookies } from 'next/headers'

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

// GET - List all requirement files
export async function GET() {
  const requirements = listRequirements()

  return NextResponse.json({
    success: true,
    requirements
  })
}

// POST - Create new requirement file (admin only)
export async function POST(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { slug, content } = await request.json()

    if (!slug || !content) {
      return NextResponse.json(
        { success: false, error: 'Slug and content required' },
        { status: 400 }
      )
    }

    // Sanitize slug
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const success = createRequirement(cleanSlug, content)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'File already exists or creation failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, slug: cleanSlug })

  } catch (error) {
    console.error('Error creating requirement:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create requirement' },
      { status: 500 }
    )
  }
}
