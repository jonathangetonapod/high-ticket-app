import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSecurePassword, type UserRole } from '@/lib/auth'
import type { UserProfileRow } from '@/lib/supabase/types'
import { requireAdmin, handleAuthError } from '@/lib/session'

// GET - List all users (admin only)
export async function GET() {
  try {
    // Require admin access
    await requireAdmin()

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    const users = (data as UserProfileRow[] | null) || []

    // Don't return sensitive data
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.full_name,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at
    }))

    return NextResponse.json({
      success: true,
      users: safeUsers
    })
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Create new user (admin only)
export async function POST(request: Request) {
  try {
    // Require admin access
    await requireAdmin()

    const { email, name, role } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and role required' },
        { status: 400 }
      )
    }

    if (!['admin', 'strategist', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Generate a secure temporary password
    const password = generateSecurePassword(16)

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { success: false, error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create user profile
    const { error: profileError } = await (supabase
      .from('user_profiles') as any)
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        role,
        is_active: true,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role
      },
      // Return password only on creation so admin can share it
      temporaryPassword: password
    })

  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
