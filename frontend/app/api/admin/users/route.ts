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

// GET - List all users (admin only)
export async function GET() {
  const { isAdmin: adminCheck } = await isAdmin()
  
  if (!adminCheck) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const users = data as UserProfileRow[] | null

  if (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    users: (users || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.full_name,
      role: u.role,
      isActive: u.is_active,
      avatarUrl: u.avatar_url,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
    })),
  })
}

// POST - Create new user or send invitation (admin only)
export async function POST(request: Request) {
  const { isAdmin: adminCheck, userId } = await isAdmin()
  
  if (!adminCheck || !userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { email, name, role, sendInvite = true } = body as {
      email: string
      name?: string
      role: UserRole
      sendInvite?: boolean
    }

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email and role are required' },
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

    // Check if user already exists
    const { data: existingData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingData) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Check for pending invitation
    const { data: existingInvite } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: 'An invitation for this email is already pending' },
        { status: 400 }
      )
    }

    if (sendInvite) {
      // Create invitation
      const token = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email,
          role,
          invited_by: userId,
          token,
          expires_at: expiresAt.toISOString(),
        } as never)

      if (inviteError) {
        console.error('Error creating invitation:', inviteError)
        return NextResponse.json(
          { success: false, error: 'Failed to create invitation' },
          { status: 500 }
        )
      }

      // Generate invitation URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${baseUrl}/invite/${token}`

      return NextResponse.json({
        success: true,
        type: 'invitation',
        inviteUrl,
        message: 'Invitation created. Share the link with the user.',
      })
    } else {
      // Create user directly with temporary password
      const tempPassword = generateSecurePassword(12)

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        console.error('Auth error:', authError)
        return NextResponse.json(
          { success: false, error: authError?.message || 'Failed to create user' },
          { status: 500 }
        )
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: name || email.split('@')[0],
          role,
          invited_by: userId,
          invited_at: new Date().toISOString(),
        } as never)
        .select()
        .single()

      const profile = profileData as UserProfileRow | null

      if (profileError || !profile) {
        console.error('Profile error:', profileError)
        await supabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { success: false, error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        type: 'direct',
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
          isActive: profile.is_active,
          createdAt: profile.created_at,
        },
        temporaryPassword: tempPassword,
        message: 'User created. Share the temporary password with them.',
      })
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
