'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Mail,
  Activity,
  CheckSquare,
  Settings,
  Zap,
  FileText,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Shield,
  LogOut,
  TrendingUp,
} from 'lucide-react'
import { useAuth, IfPermission, IfAdmin } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  permission?: string
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'view_dashboard' },
  { name: 'Delivery Checklist', href: '/delivery-checklist', icon: ClipboardCheck, permission: 'view_delivery_checklist' },
  { name: 'Clients', href: '/clients', icon: Users, permission: 'view_clients' },
  { name: 'Campaigns', href: '/campaigns', icon: Mail, permission: 'view_campaigns' },
  { name: 'Mailbox Health', href: '/mailbox-health', icon: Activity, permission: 'view_mailbox_health' },
  { name: 'Submissions', href: '/submissions', icon: CheckSquare, permission: 'view_submissions' },
  { name: 'Communications', href: '/communications', icon: MessageSquare, permission: 'view_communications' },
  { name: 'Team Performance', href: '/team-performance', icon: TrendingUp, permission: 'view_team_performance' },
  { name: 'Help & FAQ', href: '/help', icon: HelpCircle },
]

const adminNavigation: NavItem[] = [
  { name: 'User Management', href: '/admin/users', icon: Users, permission: 'view_admin_users' },
  { name: 'Permissions', href: '/admin/permissions', icon: Shield, permission: 'manage_users' },
  { name: 'Requirements', href: '/admin/requirements', icon: FileText, permission: 'view_admin_requirements' },
  { name: 'Best Practices', href: '/admin/best-practices', icon: BookOpen, permission: 'view_admin_best_practices' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, hasPermission, loading } = useAuth()

  // Don't render sidebar on auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/invite') || pathname.startsWith('/forgot-password')) {
    return null
  }

  // Don't block on loading - show sidebar immediately

  const renderNavItem = (item: NavItem) => {
    // Skip permission check if no user (auth disabled) - show all items
    if (user && item.permission && !hasPermission(item.permission)) {
      return null
    }

    const isActive = pathname === item.href || 
      (item.href !== '/' && pathname.startsWith(item.href))
    const Icon = item.icon

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          transition-colors duration-150
          ${isActive 
            ? 'bg-gray-800 text-white' 
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }
        `}
      >
        <Icon size={18} />
        {item.name}
      </Link>
    )
  }

  // Show all items if no user (auth disabled), otherwise check permissions
  const visibleNavItems = navigation.filter(item => 
    !user || !item.permission || hasPermission(item.permission)
  )

  const visibleAdminItems = adminNavigation.filter(item =>
    !user || !item.permission || hasPermission(item.permission)
  )

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">High Ticket</h1>
          <p className="text-xs text-gray-400">Strategist Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map(renderNavItem)}

        {/* Admin Section */}
        {visibleAdminItems.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-800">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Admin
            </p>
            {visibleAdminItems.map(renderNavItem)}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        {/* Settings */}
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            transition-colors duration-150
            ${pathname === '/settings'
              ? 'bg-gray-800 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }
          `}
        >
          <Settings size={18} />
          Settings
        </Link>

        {/* User Info & Logout */}
        {user && (
          <div className="pt-3 border-t border-gray-800">
            <div className="px-3 mb-2">
              <p className="text-sm font-medium text-white truncate">
                {user.profile?.full_name || user.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user.profile?.role || 'User'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-gray-800/50"
            >
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        )}

        <div className="px-3 pt-2">
          <p className="text-xs text-gray-500">Lead Gen Jay</p>
          <p className="text-xs text-gray-600">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
