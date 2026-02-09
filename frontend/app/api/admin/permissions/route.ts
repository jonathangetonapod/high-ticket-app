import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth'

// Types for database responses
interface PermissionRow {
  id: string
  name: string
  description: string | null
  category: string
}

interface RolePermissionRow {
  permission_id: string
}

interface UserProfileRow {
  role: string
  is_active: boolean
}

// Helper to check admin status
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('sb-session')
    
    if (!sessionCookie?.value) {
      return false
    }

    const sessionData = JSON.parse(sessionCookie.value)
    const supabase = createServerClient()

    const { data } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', sessionData.id)
      .single()

    const profile = data as UserProfileRow | null
    return profile?.is_active === true && profile.role === 'admin'
  } catch {
    return false
  }
}

// GET - Get all permissions and role assignments
export async function GET() {
  const adminCheck = await isAdmin()
  
  if (!adminCheck) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const supabase = createServerClient()

  // Get all permissions
  const { data: permissionsData, error: permError } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })

  if (permError) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }

  const permissions = permissionsData as PermissionRow[]

  // Get role permissions for each role
  const roles: UserRole[] = ['admin', 'strategist', 'viewer']
  const rolePermissions: Record<UserRole, string[]> = {
    admin: [],
    strategist: [],
    viewer: [],
  }

  for (const role of roles) {
    const { data } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role', role)

    const typedData = data as RolePermissionRow[] | null
    rolePermissions[role] = typedData?.map(rp => rp.permission_id) || []
  }

  // Group permissions by category
  const categories = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push({
      id: perm.id,
      name: perm.name,
      description: perm.description,
    })
    return acc
  }, {} as Record<string, Array<{ id: string; name: string; description: string | null }>>)

  return NextResponse.json({
    success: true,
    permissions,
    categories,
    rolePermissions,
  })
}

// PUT - Update role permissions
export async function PUT(request: Request) {
  const adminCheck = await isAdmin()
  
  if (!adminCheck) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { role, permissionIds } = await request.json() as {
      role: UserRole
      permissionIds: string[]
    }

    if (!role || !['admin', 'strategist', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Don't allow modifying admin permissions (they always have all)
    if (role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin permissions cannot be modified' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Delete existing role permissions
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update permissions' },
        { status: 500 }
      )
    }

    // Insert new permissions
    if (permissionIds && permissionIds.length > 0) {
      const insertData = permissionIds.map(id => ({ role, permission_id: id }))
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(insertData as never[])

      if (insertError) {
        return NextResponse.json(
          { success: false, error: 'Failed to update permissions' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully',
    })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}
