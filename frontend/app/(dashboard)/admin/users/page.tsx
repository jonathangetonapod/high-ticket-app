'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Plus,
  Loader2,
  Key,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  User,
  Eye,
  MoreHorizontal,
  UserX,
  UserCheck,
  Mail,
  Link as LinkIcon,
  Edit,
} from 'lucide-react'
import { useAuth, RequireAuth } from '@/components/auth/AuthProvider'

interface UserData {
  id: string
  email: string
  name: string
  role: 'admin' | 'strategist' | 'viewer'
  isActive: boolean
  avatarUrl: string | null
  lastLoginAt: string | null
  createdAt: string
}

type UserRole = 'admin' | 'strategist' | 'viewer'

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-700', icon: Shield },
  strategist: { label: 'Strategist', color: 'bg-blue-100 text-blue-700', icon: User },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-700', icon: Eye },
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'strategist' as UserRole })
  const [sendInvite, setSendInvite] = useState(true)
  const [creating, setCreating] = useState(false)

  // Result modal (shows password or invite link)
  const [resultModal, setResultModal] = useState<{
    type: 'password' | 'invite'
    value: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Edit modal
  const [editUser, setEditUser] = useState<UserData | null>(null)
  const [editData, setEditData] = useState({ name: '', role: 'strategist' as UserRole })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          sendInvite,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.type === 'invitation') {
          setResultModal({ type: 'invite', value: data.inviteUrl })
        } else {
          setResultModal({ type: 'password', value: data.temporaryPassword })
          setUsers([data.user, ...users])
        }
        setShowAddModal(false)
        setNewUser({ email: '', name: '', role: 'strategist' })
        toast.success('User created successfully')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      const data = await response.json()

      if (data.success) {
        setUsers(users.map(u => u.id === editUser.id ? data.user : u))
        setEditUser(null)
        toast.success('User updated')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })

      const data = await response.json()

      if (data.success) {
        setUsers(users.map(u => u.id === userId ? data.user : u))
        toast.success(currentActive ? 'User disabled' : 'User enabled')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to update user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Reset password for this user?')) return

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setResultModal({ type: 'password', value: data.newPassword })
        toast.success('Password reset successfully')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to reset password')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setUsers(users.filter(u => u.id !== userId))
        toast.success('User deleted')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openEditModal = (user: UserData) => {
    setEditUser(user)
    setEditData({ name: user.name, role: user.role })
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
    strategists: users.filter(u => u.role === 'strategist').length,
    viewers: users.filter(u => u.role === 'viewer').length,
  }

  return (
    <RequireAuth permission="manage_users" fallback={
      <div className="p-8 text-center">
        <Shield className="mx-auto text-gray-300" size={48} />
        <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
        <p className="text-gray-500">You don&apos;t have permission to manage users.</p>
      </div>
    }>
      <div className="min-h-screen">
        <Header
          title="User Management"
          description="Manage user accounts and permissions"
        />

        <div className="p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Users className="text-gray-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <UserCheck className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-xs text-gray-500">Admins</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.strategists}</p>
                  <p className="text-xs text-gray-500">Strategists</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Eye className="text-gray-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.viewers}</p>
                  <p className="text-xs text-gray-500">Viewers</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add User Button */}
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus size={16} />
            Add User
          </Button>

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role]
                const RoleIcon = roleConfig.icon
                const isCurrentUser = user.id === currentUser?.id

                return (
                  <Card key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.role === 'admin' ? 'bg-purple-100' : 
                            user.role === 'strategist' ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <RoleIcon className={
                              user.role === 'admin' ? 'text-purple-600' : 
                              user.role === 'strategist' ? 'text-blue-600' : 'text-gray-600'
                            } size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{user.name}</p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                              {!user.isActive && (
                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <Badge className={roleConfig.color}>
                            {roleConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          {user.lastLoginAt && (
                            <span className="text-xs text-gray-400 hidden sm:block">
                              Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                            </span>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={actionLoading === user.id}>
                                {actionLoading === user.id ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <MoreHorizontal size={16} />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(user)}>
                                <Edit size={14} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                <Key size={14} className="mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(user.id, user.isActive)}
                                disabled={isCurrentUser}
                              >
                                {user.isActive ? (
                                  <>
                                    <UserX size={14} className="mr-2" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={14} className="mr-2" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={isCurrentUser}
                                className="text-red-600"
                              >
                                <Trash2 size={14} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto text-gray-300" size={48} />
                  <p className="text-gray-500 mt-4">No users yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add User Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account or send an invitation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@company.com"
                  required
                />
              </div>
              {!sendInvite && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe"
                    required={!sendInvite}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="strategist">Strategist</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 py-2">
                <div 
                  className={`flex-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                    sendInvite ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSendInvite(true)}
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon size={16} className={sendInvite ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${sendInvite ? 'text-blue-700' : 'text-gray-600'}`}>
                      Send Invite Link
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">User sets their own password</p>
                </div>
                <div 
                  className={`flex-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                    !sendInvite ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSendInvite(false)}
                >
                  <div className="flex items-center gap-2">
                    <Key size={16} className={!sendInvite ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${!sendInvite ? 'text-blue-700' : 'text-gray-600'}`}>
                      Create with Password
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Generate temporary password</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Creating...
                    </>
                  ) : sendInvite ? (
                    'Create Invitation'
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details and role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editData.role}
                  onValueChange={(value: UserRole) => setEditData({ ...editData, role: value })}
                  disabled={editUser?.id === currentUser?.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="strategist">Strategist</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                {editUser?.id === currentUser?.id && (
                  <p className="text-xs text-gray-500">You cannot change your own role</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Result Modal */}
        <Dialog open={!!resultModal} onOpenChange={() => setResultModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {resultModal?.type === 'invite' ? 'Invitation Created' : 'Password Generated'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-amber-900 font-medium">
                    {resultModal?.type === 'invite' 
                      ? 'Share this link with the user'
                      : 'Share this password with the user'}
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    {resultModal?.type === 'invite'
                      ? 'This link expires in 7 days'
                      : 'They should change it after first login'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded border text-sm font-mono break-all">
                  {resultModal?.value}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(resultModal?.value || '')}
                  className="flex-shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                if (resultModal?.type === 'invite') {
                  loadUsers() // Refresh to show pending invitation
                }
                setResultModal(null)
              }}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  )
}
