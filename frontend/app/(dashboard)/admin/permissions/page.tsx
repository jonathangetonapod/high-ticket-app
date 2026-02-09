'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Shield,
  User,
  Eye,
  Save,
  RefreshCw,
  Check,
  Lock,
} from 'lucide-react'
import { RequireAuth } from '@/components/auth/AuthProvider'
import { PERMISSION_CATEGORIES } from '@/lib/auth'

interface Permission {
  id: string
  name: string
  description: string | null
  category: string
}

type UserRole = 'admin' | 'strategist' | 'viewer'

const ROLE_CONFIG: Record<UserRole, { label: string; description: string; icon: typeof Shield; color: string }> = {
  admin: { 
    label: 'Administrator', 
    description: 'Full access to all features',
    icon: Shield, 
    color: 'text-purple-600 bg-purple-100' 
  },
  strategist: { 
    label: 'Strategist', 
    description: 'Can manage campaigns and clients',
    icon: User, 
    color: 'text-blue-600 bg-blue-100' 
  },
  viewer: { 
    label: 'Viewer', 
    description: 'Read-only access',
    icon: Eye, 
    color: 'text-gray-600 bg-gray-100' 
  },
}

export default function PermissionsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [categories, setCategories] = useState<Record<string, Permission[]>>({})
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    admin: [],
    strategist: [],
    viewer: [],
  })
  const [hasChanges, setHasChanges] = useState<Record<UserRole, boolean>>({
    admin: false,
    strategist: false,
    viewer: false,
  })
  const [savedMessage, setSavedMessage] = useState<UserRole | null>(null)

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions')
      const data = await response.json()
      
      if (data.success) {
        setPermissions(data.permissions)
        setCategories(data.categories)
        setRolePermissions(data.rolePermissions)
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (role: UserRole, permissionId: string) => {
    if (role === 'admin') return // Admin always has all permissions

    setRolePermissions(prev => {
      const current = prev[role]
      const updated = current.includes(permissionId)
        ? current.filter(id => id !== permissionId)
        : [...current, permissionId]
      
      return { ...prev, [role]: updated }
    })

    setHasChanges(prev => ({ ...prev, [role]: true }))
  }

  const saveRolePermissions = async (role: UserRole) => {
    setSaving(role)
    
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          permissionIds: rolePermissions[role],
        }),
      })

      const data = await response.json()

      if (data.success) {
        setHasChanges(prev => ({ ...prev, [role]: false }))
        setSavedMessage(role)
        setTimeout(() => setSavedMessage(null), 2000)
        toast.success('Permissions saved')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to save permissions')
    } finally {
      setSaving(null)
    }
  }

  const getCategoryDisplayName = (category: string): string => {
    return PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || category
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Permissions" description="Configure role-based access control" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      </div>
    )
  }

  return (
    <RequireAuth permission="manage_users" fallback={
      <div className="p-8 text-center">
        <Shield className="mx-auto text-gray-300" size={48} />
        <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
        <p className="text-gray-500">You don&apos;t have permission to manage permissions.</p>
      </div>
    }>
      <div className="min-h-screen">
        <Header
          title="Role Permissions"
          description="Configure what each role can access"
        />

        <div className="p-8">
          <Tabs defaultValue="strategist" className="space-y-6">
            <TabsList>
              {(['admin', 'strategist', 'viewer'] as const).map(role => {
                const config = ROLE_CONFIG[role]
                const Icon = config.icon
                return (
                  <TabsTrigger key={role} value={role} className="gap-2">
                    <Icon size={16} />
                    {config.label}
                    {hasChanges[role] && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {(['admin', 'strategist', 'viewer'] as const).map(role => {
              const config = ROLE_CONFIG[role]
              const Icon = config.icon
              const isAdmin = role === 'admin'

              return (
                <TabsContent key={role} value={role} className="space-y-6">
                  {/* Role Header */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color}`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{config.label}</h3>
                            <p className="text-sm text-gray-500">{config.description}</p>
                          </div>
                        </div>
                        {!isAdmin && (
                          <Button
                            onClick={() => saveRolePermissions(role)}
                            disabled={saving === role || !hasChanges[role]}
                            className="gap-2"
                          >
                            {saving === role ? (
                              <>
                                <Loader2 className="animate-spin" size={16} />
                                Saving...
                              </>
                            ) : savedMessage === role ? (
                              <>
                                <Check size={16} />
                                Saved!
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Save Changes
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                          <Lock size={16} />
                          <span>Admin role always has all permissions and cannot be modified.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Permissions by Category */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {Object.entries(categories).map(([category, perms]) => (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{getCategoryDisplayName(category)}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {perms.map(perm => {
                            const isChecked = isAdmin || rolePermissions[role].includes(perm.id)
                            
                            return (
                              <div
                                key={perm.id}
                                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                                  isAdmin ? 'bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'
                                }`}
                                onClick={() => !isAdmin && togglePermission(role, perm.id)}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  disabled={isAdmin}
                                  className="mt-0.5"
                                />
                                <div>
                                  <p className="text-sm font-medium">{formatPermissionName(perm.name)}</p>
                                  {perm.description && (
                                    <p className="text-xs text-gray-500">{perm.description}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      </div>
    </RequireAuth>
  )
}

function formatPermissionName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
