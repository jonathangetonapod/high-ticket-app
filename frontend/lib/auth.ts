// Authentication and Authorization Library
// Uses Supabase Auth with custom user profiles and RBAC

import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'

// =====================================================
// Types
// =====================================================

export type UserRole = 'admin' | 'strategist' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  invited_by: string | null
  invited_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  description: string | null
  category: string
}

export interface UserInvitation {
  id: string
  email: string
  role: UserRole
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
  permissions: string[]
}

// =====================================================
// Permission Categories
// =====================================================

export const PERMISSION_CATEGORIES = {
  dashboard: 'Dashboard',
  delivery: 'Delivery Checklist',
  clients: 'Clients',
  campaigns: 'Campaigns',
  mailbox: 'Mailbox Health',
  submissions: 'Submissions',
  communications: 'Communications',
  admin: 'Admin',
  settings: 'Settings',
} as const

// =====================================================
// Client-side Auth Functions
// =====================================================

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  // Update last login
  if (data.user) {
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)
  }

  return data
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user permissions
  const { data: permissions } = await (supabase as any)
    .rpc('get_user_permissions', { user_id: user.id })

  return {
    id: user.id,
    email: user.email || '',
    profile: profile as UserProfile | null,
    permissions: permissions?.map((p: { permission_name: string }) => p.permission_name) || [],
  }
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    return null
  }
  
  return session
}

// =====================================================
// Server-side Auth Functions
// =====================================================

export async function getServerUser(): Promise<AuthUser | null> {
  const supabase = createServerClient()
  
  // For server-side, we need to get the session differently
  // This uses the service role key, so we need to extract user from session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { data: permissions } = await (supabase as any)
    .rpc('get_user_permissions', { user_id: session.user.id })

  return {
    id: session.user.id,
    email: session.user.email || '',
    profile: profile as UserProfile | null,
    permissions: permissions?.map((p: { permission_name: string }) => p.permission_name) || [],
  }
}

// =====================================================
// User Management (Admin)
// =====================================================

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data as UserProfile[]
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return null
  }

  return data as UserProfile
}

export async function createUserInvitation(
  email: string,
  role: UserRole,
  invitedBy: string
): Promise<{ token: string } | null> {
  const supabase = createServerClient()
  
  // Generate a secure token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  
  // Set expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await (supabase
    .from('user_invitations') as any)
    .insert({
      email,
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Error creating invitation:', error)
    return null
  }

  return { token }
}

export async function getInvitationByToken(token: string): Promise<UserInvitation | null> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (error) {
    return null
  }

  return data as UserInvitation
}

export async function acceptInvitation(
  token: string,
  password: string,
  fullName: string
): Promise<AuthUser | null> {
  const supabase = createServerClient()
  
  // Get invitation
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    throw new Error('Invalid or expired invitation')
  }

  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user')
  }

  // Create user profile
  const { error: profileError } = await (supabase
    .from('user_profiles') as any)
    .insert({
      id: authData.user.id,
      email: invitation.email,
      full_name: fullName,
      role: invitation.role,
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
    })

  if (profileError) {
    console.error('Error creating profile:', profileError)
    // Try to delete the auth user if profile creation failed
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('Failed to create user profile')
  }

  // Mark invitation as accepted
  await (supabase
    .from('user_invitations') as any)
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return getCurrentUser()
}

export async function createUserDirectly(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  invitedBy?: string
): Promise<UserProfile | null> {
  const supabase = createServerClient()

  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user')
  }

  // Create user profile
  const { data: profile, error: profileError } = await (supabase
    .from('user_profiles') as any)
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      invited_by: invitedBy || null,
      invited_at: invitedBy ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (profileError) {
    console.error('Error creating profile:', profileError)
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('Failed to create user profile')
  }

  return profile as UserProfile
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'role' | 'is_active' | 'avatar_url'>>
): Promise<UserProfile | null> {
  const supabase = createServerClient()

  const { data, error } = await (supabase
    .from('user_profiles') as any)
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    return null
  }

  return data as UserProfile
}

export async function deleteUser(userId: string): Promise<boolean> {
  const supabase = createServerClient()

  // Delete auth user (profile will be cascade deleted)
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Error deleting user:', error)
    return false
  }

  return true
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const supabase = createServerClient()

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    console.error('Error resetting password:', error)
    return false
  }

  return true
}

// =====================================================
// Permission Management
// =====================================================

export async function getAllPermissions(): Promise<Permission[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })

  if (error) {
    console.error('Error fetching permissions:', error)
    return []
  }

  return data as Permission[]
}

export async function getRolePermissions(role: UserRole): Promise<string[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(name)')
    .eq('role', role)

  if (error) {
    console.error('Error fetching role permissions:', error)
    return []
  }

  return data.map((rp: { permissions: { name: string } }) => rp.permissions.name)
}

export async function updateRolePermissions(
  role: UserRole,
  permissionIds: string[]
): Promise<boolean> {
  const supabase = createServerClient()

  // Delete existing role permissions
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role', role)

  if (deleteError) {
    console.error('Error deleting role permissions:', deleteError)
    return false
  }

  // Insert new permissions
  if (permissionIds.length > 0) {
    const { error: insertError } = await (supabase
      .from('role_permissions') as any)
      .insert(permissionIds.map(id => ({ role, permission_id: id })))

    if (insertError) {
      console.error('Error inserting role permissions:', insertError)
      return false
    }
  }

  return true
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user || !user.profile?.is_active) {
    return false
  }
  
  // Admin always has all permissions
  if (user.profile.role === 'admin') {
    return true
  }

  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(user, p))
}

export function hasAllPermissions(user: AuthUser | null, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(user, p))
}

// =====================================================
// Utility Functions
// =====================================================

export function generateSecurePassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length]
  }
  return password
}

export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    strategist: 'Strategist',
    viewer: 'Viewer',
  }
  return names[role]
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'purple',
    strategist: 'blue',
    viewer: 'gray',
  }
  return colors[role]
}
