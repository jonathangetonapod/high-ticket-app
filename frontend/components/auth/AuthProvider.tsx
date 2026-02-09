'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser, UserRole } from '@/lib/auth'

// =====================================================
// Types
// =====================================================

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  isRole: (role: UserRole) => boolean
  isAdmin: boolean
}

// =====================================================
// Context
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// =====================================================
// Public Routes (no auth required)
// =====================================================

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/invite']

// =====================================================
// Provider Component
// =====================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Only create Supabase client after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  const supabase = mounted ? createClient() : null

  // Fetch current user and profile
  const fetchUser = useCallback(async () => {
    if (!supabase) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setUser(null)
        return
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Fetch permissions via RPC
      const { data: permissionsData } = await supabase
        .rpc('get_user_permissions', { user_id: session.user.id })

      const permissions = permissionsData?.map((p: { permission_name: string }) => p.permission_name) || []

      setUser({
        id: session.user.id,
        email: session.user.email || '',
        profile,
        permissions,
      })
    } catch (err) {
      console.error('Error fetching user:', err)
      setUser(null)
    }
  }, [supabase])

  // Initial load - only run once supabase is ready
  useEffect(() => {
    if (!supabase) return
    
    const initAuth = async () => {
      setLoading(true)
      await fetchUser()
      setLoading(false)
    }
    initAuth()
  }, [supabase, fetchUser])

  // Listen for auth changes
  useEffect(() => {
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, _session: unknown) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUser])

  // Redirect logic
  useEffect(() => {
    if (loading) return

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

    if (!user && !isPublicRoute) {
      // Not logged in and trying to access protected route
      router.push('/login')
    } else if (user && pathname === '/login') {
      // Logged in and on login page
      router.push('/')
    } else if (user && !user.profile?.is_active) {
      // User is disabled
      setError('Your account has been disabled. Please contact an administrator.')
      signOut()
    }
  }, [user, loading, pathname, router])

  // Sign in
  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Not initialized')
    setError(null)
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      throw signInError
    }

    // Fetch user data
    await fetchUser()

    // Update last login
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
    }
  }

  // Sign out
  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  // Refresh user data
  const refreshUser = async () => {
    await fetchUser()
  }

  // Permission checks
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.profile?.is_active) return false
    if (user.profile.role === 'admin') return true
    return user.permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }

  const isRole = (role: UserRole): boolean => {
    return user?.profile?.role === role
  }

  const isAdmin = user?.profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
        refreshUser,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// =====================================================
// Hook
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// =====================================================
// Protected Component Wrapper
// =====================================================

interface RequireAuthProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: UserRole
  fallback?: React.ReactNode
}

export function RequireAuth({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
}: RequireAuthProps) {
  const { user, loading, hasPermission, hasAnyPermission, hasAllPermissions, isRole } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return <>{fallback}</>
  }

  // Check role
  if (role && !isRole(role)) {
    return <>{fallback}</>
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    
    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// =====================================================
// Permission-Based Show/Hide
// =====================================================

interface IfPermissionProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function IfPermission({ permission, children, fallback = null }: IfPermissionProps) {
  const { hasPermission } = useAuth()
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}

interface IfAdminProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function IfAdmin({ children, fallback = null }: IfAdminProps) {
  const { isAdmin } = useAuth()
  return isAdmin ? <>{children}</> : <>{fallback}</>
}
