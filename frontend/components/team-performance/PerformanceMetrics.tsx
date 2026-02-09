'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Mail,
  Eye,
  MessageSquare,
  ThumbsUp,
  Calendar,
  Rocket,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { TeamPerformanceData } from './TeamPerformanceDashboard'

interface PerformanceMetricsProps {
  metrics?: TeamPerformanceData['metrics']
  comparison?: TeamPerformanceData['previousPeriodComparison']
  platforms?: TeamPerformanceData['platforms']
  loading?: boolean
}

function MetricSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-32 mt-4" />
      </CardContent>
    </Card>
  )
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  
  const change = ((current - previous) / previous) * 100
  const isPositive = change > 0
  const isNeutral = Math.abs(change) < 1
  
  if (isNeutral) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Minus size={12} />
        No change
      </span>
    )
  }
  
  return (
    <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isPositive ? '+' : ''}{change.toFixed(1)}% vs previous
    </span>
  )
}

export function PerformanceMetrics({ metrics, comparison, platforms, loading }: PerformanceMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <MetricSkeleton key={i} />)}
      </div>
    )
  }

  if (!metrics) return null

  const metricCards = [
    {
      label: 'Emails Sent',
      value: metrics.totalEmailsSent.toLocaleString(),
      rawValue: metrics.totalEmailsSent,
      previousValue: comparison?.emailsSent || 0,
      icon: Mail,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: platforms 
        ? `Instantly: ${platforms.instantly.emailsSent.toLocaleString()} | Bison: ${platforms.bison.emailsSent.toLocaleString()}`
        : null
    },
    {
      label: 'Open Rate',
      value: `${metrics.openRate.toFixed(1)}%`,
      rawValue: metrics.openRate,
      previousValue: comparison?.openRate || 0,
      icon: Eye,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      description: platforms
        ? `I: ${platforms.instantly.openRate.toFixed(1)}% | B: ${platforms.bison.openRate.toFixed(1)}%`
        : null
    },
    {
      label: 'Reply Rate',
      value: `${metrics.replyRate.toFixed(1)}%`,
      rawValue: metrics.replyRate,
      previousValue: comparison?.replyRate || 0,
      icon: MessageSquare,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      description: platforms
        ? `I: ${platforms.instantly.replyRate.toFixed(1)}% | B: ${platforms.bison.replyRate.toFixed(1)}%`
        : null
    },
    {
      label: 'Positive Reply Rate',
      value: `${metrics.positiveReplyRate.toFixed(1)}%`,
      rawValue: metrics.positiveReplyRate,
      previousValue: comparison?.positiveReplyRate || 0,
      icon: ThumbsUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Interested leads / Total replies'
    },
    {
      label: 'Meetings Booked',
      value: metrics.meetingsBooked.toString(),
      rawValue: metrics.meetingsBooked,
      previousValue: comparison?.meetingsBooked || 0,
      icon: Calendar,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      description: 'Via reply sentiment analysis'
    },
    {
      label: 'Campaigns Launched',
      value: metrics.campaignsLaunched.toString(),
      rawValue: metrics.campaignsLaunched,
      previousValue: comparison?.campaignsLaunched || 0,
      icon: Rocket,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      description: platforms
        ? `I: ${platforms.instantly.campaigns} | B: ${platforms.bison.campaigns}`
        : null
    }
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={card.iconColor} size={20} />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <TrendIndicator current={card.rawValue} previous={card.previousValue} />
                {card.description && (
                  <p className="text-xs text-gray-400 truncate" title={card.description}>
                    {card.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {platforms && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Platform Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Instantly
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold">{platforms.instantly.emailsSent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{platforms.instantly.openRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Opens</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{platforms.instantly.replyRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Replies</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{platforms.instantly.campaigns}</p>
                    <p className="text-xs text-gray-500">Campaigns</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Bison
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold">{platforms.bison.emailsSent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{platforms.bison.openRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Opens</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{platforms.bison.replyRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Replies</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{platforms.bison.campaigns}</p>
                    <p className="text-xs text-gray-500">Campaigns</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
