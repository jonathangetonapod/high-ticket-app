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
  MessageSquare
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Delivery Checklist', href: '/delivery-checklist', icon: ClipboardCheck },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Mailbox Health', href: '/mailbox-health', icon: Activity },
  { name: 'Submissions', href: '/submissions', icon: CheckSquare },
  { name: 'Communications', href: '/communications', icon: MessageSquare },
  { name: 'Help & FAQ', href: '/help', icon: HelpCircle },
]

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Requirements', href: '/admin/requirements', icon: FileText },
  { name: 'Best Practices', href: '/admin/best-practices', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white">
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
        {navigation.map((item) => {
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
        })}

        {/* Admin Section */}
        <div className="pt-4 mt-4 border-t border-gray-800">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Admin
          </p>
          {adminNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
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
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <Settings size={18} />
          Settings
        </Link>
        <div className="mt-4 px-3">
          <p className="text-xs text-gray-500">Lead Gen Jay</p>
          <p className="text-xs text-gray-600">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
