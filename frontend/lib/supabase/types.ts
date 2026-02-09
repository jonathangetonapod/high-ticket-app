// Supabase Database Types
// These types match the database schema

export interface UserProfileRow {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'strategist' | 'viewer'
  is_active: boolean
  avatar_url: string | null
  invited_by: string | null
  invited_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface PermissionRow {
  id: string
  name: string
  description: string | null
  category: string
  created_at: string
}

export interface RolePermissionRow {
  id: string
  role: 'admin' | 'strategist' | 'viewer'
  permission_id: string
  created_at: string
}

export interface UserInvitationRow {
  id: string
  email: string
  role: 'admin' | 'strategist' | 'viewer'
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// Partial types for select queries
export interface UserProfilePartial {
  role: 'admin' | 'strategist' | 'viewer'
  is_active: boolean
}

export interface RolePermissionPartial {
  permission_id: string
}

// Team Performance Metrics
export interface TeamMetricsRow {
  id: string
  date: string
  metric_type: string
  value: number
  source: 'instantly' | 'bison' | 'slack' | 'combined'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TeamMetricsInsert {
  date: string
  metric_type: string
  value: number
  source: 'instantly' | 'bison' | 'slack' | 'combined'
  metadata?: Record<string, unknown>
}
