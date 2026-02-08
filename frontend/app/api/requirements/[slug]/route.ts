import { NextResponse } from 'next/server'
import { getRequirement, saveRequirement, deleteRequirement } from '@/lib/requirements'
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

// GET - Get single requirement
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const requirement = getRequirement(slug)

  if (!requirement) {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    requirement
  })
}

// PUT - Update requirement (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { slug } = await params
  
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content required' },
        { status: 400 }
      )
    }

    const success = saveRequirement(slug, content)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating requirement:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update requirement' },
      { status: 500 }
    )
  }
}

// DELETE - Delete requirement (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { slug } = await params
  const success = deleteRequirement(slug)

  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
