import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import type { UserProfileRow } from '@/lib/supabase/types'

interface PermissionResult {
  permission_name: string
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('sb-session')

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    let sessionData: {
      id: string
      email: string
      role: string
      name: string
      accessToken: string
      refreshToken: string
    }

    try {
      sessionData = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Verify the session is still valid by checking the user exists
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', sessionData.id)
      .single()

    const profile = profileData as UserProfileRow | null

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      )
    }

    // Check if user is still active
    if (!profile.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account disabled' },
        { status: 403 }
      )
    }

    // Get user permissions - use type assertion for RPC
    const { data: permissionsData } = await (supabase as ReturnType<typeof createServerClient>)
      .rpc('get_user_permissions', { user_id: sessionData.id } as never)

    const permissions = permissionsData as PermissionResult[] | null

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        avatar_url: profile.avatar_url,
        permissions: permissions?.map((p) => p.permission_name) || [],
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { success: false, error: 'Invalid session' },
      { status: 401 }
    )
  }
}
