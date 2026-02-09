'use client'

import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, TrendingUp, Star, Users } from 'lucide-react'

interface CommunicationsStatsProps {
  stats: {
    repliesToday: number
    repliesThisWeek: number
    interestedLeads: number
    activeClients: number
  }
  loading?: boolean
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export function CommunicationsStats({ stats, loading }: CommunicationsStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    )
  }

  const statItems = [
    {
      label: 'Replies Today',
      value: stats.repliesToday,
      icon: MessageSquare,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: stats.repliesToday > 0 ? '+' + stats.repliesToday : null
    },
    {
      label: 'This Week',
      value: stats.repliesThisWeek,
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      trend: null
    },
    {
      label: 'Interested Leads',
      value: stats.interestedLeads,
      icon: Star,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      trend: stats.interestedLeads > 0 ? '🔥' : null
    },
    {
      label: 'Active Clients',
      value: stats.activeClients,
      icon: Users,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      trend: null
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center`}>
              <item.icon className={item.iconColor} size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{item.value}</p>
                {item.trend && (
                  <span className="text-xs text-green-600 font-medium">{item.trend}</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
