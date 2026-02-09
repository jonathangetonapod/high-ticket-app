import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { signSession, setSessionCookie, SessionUser } from '@/lib/session'
import { loginRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import type { UserProfileRow } from '@/lib/supabase/types'

interface PermissionResult {
  permission_name: string
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (5 attempts per minute per IP)
    const rateLimitResult = await loginRateLimiter.check(request)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: 'Login failed' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    const profile = profileData as UserProfileRow | null

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!profile.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled' },
        { status: 403 }
      )
    }

    // Update last login
    await (supabase
      .from('user_profiles') as any)
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)

    // Get user permissions
    const { data: permissionsData } = await (supabase as any)
      .rpc('get_user_permissions', { user_id: data.user.id })

    const permissions = permissionsData as PermissionResult[] | null

    // Create session user object for JWT
    const sessionUser: SessionUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: profile.full_name,
      role: profile.role,
    }

    // Sign the session JWT
    const sessionToken = await signSession(sessionUser)

    // Set the session cookie
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        profile: {
          full_name: profile.full_name,
          role: profile.role,
          avatar_url: profile.avatar_url,
        },
        permissions: permissions?.map((p) => p.permission_name) || [],
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
