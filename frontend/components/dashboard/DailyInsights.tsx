'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Mail,
  Target,
  Clock,
  ChevronRight,
  RefreshCw,
  Bot
} from 'lucide-react'

interface Insight {
  id: string
  date: string
  insight_type: string
  client_id?: string
  client_name?: string
  platform?: string
  title: string
  summary?: string
  data?: Record<string, unknown>
  priority: string
  created_at: string
}

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  response_summary: Mail,
  interested_lead: Target,
  at_risk_client: AlertTriangle,
  missed_opportunity: TrendingDown,
  performance_trend: TrendingUp,
  campaign_health: Sparkles,
  default: Bot
}

const INSIGHT_COLORS: Record<string, string> = {
  response_summary: 'bg-blue-100 text-blue-700',
  interested_lead: 'bg-emerald-100 text-emerald-700',
  at_risk_client: 'bg-red-100 text-red-700',
  missed_opportunity: 'bg-amber-100 text-amber-700',
  performance_trend: 'bg-purple-100 text-purple-700',
  campaign_health: 'bg-indigo-100 text-indigo-700',
  default: 'bg-gray-100 text-gray-700'
}

const PRIORITY_BADGES: Record<string, string> = {
  high: 'bg-red-500 text-white',
  normal: 'bg-gray-200 text-gray-700',
  low: 'bg-gray-100 text-gray-500'
}

export function DailyInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/insights?days=7&limit=10')
      const data = await response.json()
      
      if (data.success) {
        setInsights(data.insights)
      } else {
        setError(data.error || 'Failed to load insights')
      }
    } catch (err) {
      setError('Failed to fetch insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getIcon = (type: string) => {
    return INSIGHT_ICONS[type] || INSIGHT_ICONS.default
  }

  const getColor = (type: string) => {
    return INSIGHT_COLORS[type] || INSIGHT_COLORS.default
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="text-purple-500" size={20} />
              AI Daily Insights
            </CardTitle>
            <CardDescription>Agent-generated analysis from BridgeKit data</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock size={12} className="mr-1" />
              9am EST
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && insights.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="animate-spin mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm">Loading insights...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="mx-auto mb-2 text-amber-400" size={32} />
            <p className="text-sm">{error}</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bot className="mx-auto mb-3 text-purple-300" size={40} />
            <p className="font-medium text-gray-700">No insights yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Daily analysis runs at 9am EST
            </p>
            <p className="text-xs text-gray-400 mt-2">
              I'll analyze client comms, campaign performance, and surface what needs attention.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const Icon = getIcon(insight.insight_type)
              const colorClass = getColor(insight.insight_type)

              return (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {insight.title}
                      </p>
                      {insight.priority === 'high' && (
                        <Badge className={PRIORITY_BADGES.high} variant="secondary">
                          High
                        </Badge>
                      )}
                    </div>
                    {insight.summary && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {insight.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                      <span>{formatDate(insight.created_at)}</span>
                      {insight.client_name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users size={10} />
                            {insight.client_name}
                          </span>
                        </>
                      )}
                      {insight.platform && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{insight.platform}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
