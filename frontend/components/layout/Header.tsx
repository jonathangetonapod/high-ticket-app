'use client'

import { useRouter } from 'next/navigation'
import { Bell, Search, User, LogOut, ChevronDown, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/auth/AuthProvider'
import { getRoleDisplayName, getRoleColor } from '@/lib/auth'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const router = useRouter()
  const { user, signOut, loading } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  const roleColor = user?.profile?.role 
    ? getRoleColor(user.profile.role) 
    : 'gray'

  const roleColorClasses: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between h-16 px-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 pl-9 bg-gray-50 border-gray-200"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                {user?.profile?.role === 'admin' ? (
                  <Shield size={18} className="text-purple-600" />
                ) : (
                  <User size={18} />
                )}
                {user && !loading && (
                  <>
                    <span className="hidden sm:inline text-sm">
                      {user.profile?.full_name || user.email}
                    </span>
                    <ChevronDown size={14} />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && user.profile && (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.profile.full_name}</span>
                      <span className="text-xs text-gray-500 font-normal">{user.email}</span>
                      <Badge className={`w-fit mt-2 ${roleColorClasses[roleColor]}`}>
                        {getRoleDisplayName(user.profile.role)}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut size={16} className="mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
