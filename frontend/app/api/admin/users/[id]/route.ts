import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { generateSecurePassword, type UserRole } from '@/lib/auth'
import type { UserProfileRow, UserProfilePartial } from '@/lib/supabase/types'

// Helper to check admin status
async function isAdmin(): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('sb-session')
    
    if (!sessionCookie?.value) {
      return { isAdmin: false, userId: null }
    }

    const sessionData = JSON.parse(sessionCookie.value)
    const supabase = createServerClient()

    const { data } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', sessionData.id)
      .single()

    const profile = data as UserProfilePartial | null
    if (!profile?.is_active || profile.role !== 'admin') {
      return { isAdmin: false, userId: sessionData.id }
    }

    return { isAdmin: true, userId: sessionData.id }
  } catch {
    return { isAdmin: false, userId: null }
  }
}

// GET - Get single user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // const { isAdmin: adminCheck } = await isAdmin()
  
  if (false) { // TODO: re-enable auth
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single()

  const user = data as UserProfileRow | null

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      isActive: user.is_active,
      avatarUrl: user.avatar_url,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    },
  })
}

// PATCH - Update user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // const { isAdmin: adminCheck, userId: currentUserId } = await isAdmin()
  const currentUserId = "5f5a0dd0-3ab1-4cce-9e6c-33d2c93a848c"
  
  if (false) { // TODO: re-enable auth
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, role, isActive } = body as {
      name?: string
      role?: UserRole
      isActive?: boolean
    }

    // Prevent self-demotion from admin
    if (id === currentUserId && role && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    // Prevent disabling yourself
    if (id === currentUserId && isActive === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot disable your own account' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.full_name = name
    if (role !== undefined) updates.role = role
    if (isActive !== undefined) updates.is_active = isActive

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single()

    const user = data as UserProfileRow | null

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        isActive: user.is_active,
        avatarUrl: user.avatar_url,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // const { isAdmin: adminCheck, userId: currentUserId } = await isAdmin()
  const currentUserId = "5f5a0dd0-3ab1-4cce-9e6c-33d2c93a848c"
  
  if (false) { // TODO: re-enable auth
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { id } = await params

  // Prevent self-deletion
  if (id === currentUserId) {
    return NextResponse.json(
      { success: false, error: 'You cannot delete your own account' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  // Delete auth user (profile will cascade delete)
  const { error } = await supabase.auth.admin.deleteUser(id)

  if (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'User deleted successfully',
  })
}

// POST - Reset password
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // const { isAdmin: adminCheck } = await isAdmin()
  
  if (false) { // TODO: re-enable auth
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { id } = await params
  const supabase = createServerClient()

  const newPassword = generateSecurePassword(12)

  const { error } = await supabase.auth.admin.updateUserById(id, {
    password: newPassword,
  })

  if (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    newPassword,
    message: 'Password reset successfully. Share the new password with the user.',
  })
}
