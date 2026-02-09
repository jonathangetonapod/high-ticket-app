import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { UserInvitationRow, UserProfileRow } from '@/lib/supabase/types'

// Partial invitation for select
interface InvitationPartial {
  email: string
  role: 'admin' | 'strategist' | 'viewer'
  expires_at: string
}

// GET - Verify invitation token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('user_invitations')
      .select('email, role, expires_at')
      .eq('token', token)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    const invitation = data as InvitationPartial | null

    if (error || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    })
  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}

// POST - Accept invitation and create account
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { fullName, password } = await request.json()

    if (!fullName || !password) {
      return NextResponse.json(
        { success: false, error: 'Full name and password required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get invitation
    const { data: inviteData, error: inviteError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    const invitation = inviteData as UserInvitationRow | null

    if (inviteError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        full_name: fullName,
        role: invitation.role,
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
      } as never)

    if (profileError) {
      console.error('Profile error:', profileError)
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({ accepted_at: new Date().toISOString() } as never)
      .eq('id', invitation.id)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
