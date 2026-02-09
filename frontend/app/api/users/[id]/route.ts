import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSecurePassword } from '@/lib/auth'
import type { UserProfileRow } from '@/lib/supabase/types'
import { requireAdmin, handleAuthError, getCurrentUser } from '@/lib/session'

// GET - Get user details (admin only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin access
    await requireAdmin()

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
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin access
    const currentUser = await requireAdmin()

    const { id } = await params

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Delete auth user (profile cascades)
    const { error } = await supabase.auth.admin.deleteUser(id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

// POST - Reset password (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin access
    await requireAdmin()

    const { id } = await params
    const supabase = createServerClient()

    // Check user exists
    const { data, error: findError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', id)
      .single()

    if (findError || !data) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

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
    })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error resetting password:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
