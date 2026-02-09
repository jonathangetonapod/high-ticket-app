'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { DailyInsights } from '@/components/dashboard/DailyInsights'
import { ClientCommunications } from '@/components/dashboard/ClientCommunications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Users,
  Activity,
  TrendingDown,
  ArrowRight,
  Loader2,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Rocket,
  Calendar,
  Timer,
  Inbox,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy,
  Clock
} from 'lucide-react'

interface AtRiskClient {
  id: string
  clientName: string
  platform: string
  daysSinceActivity: number
  hasMailboxIssues: boolean
  lastActivityDate: string
}

interface ClientHealth {
  healthy: number
  needsAttention: number
  atRisk: number
  details: {
    id: string
    clientName: string
    platform: string
    status: 'healthy' | 'attention' | 'atRisk'
    issues: string[]
  }[]
}

interface ActionRequired {
  pendingSubmissions: { count: number; oldestWaitingDays: number; oldestClient: string }
  failingMailboxes: { count: number; clientsAffected: number }
  stuckDeliveries: { count: number; longestWaitingDays: number }
}

interface LongestWaiting {
  clientName: string
  daysWaiting: number
  submittedAt: string
  platform: string
}

interface ClientPerformance {
  clientName: string
  platform: string
  responseRate: number
  totalSent: number
  totalResponses: number
}

interface DeliverySLA {
  withinTargetPercent: number
  targetDays: number
  clientsWaiting: { clientName: string; daysWaiting: number; platform: string }[]
}

interface DashboardData {
  timestamp: string
  clients: {
    total: number
    instantly: number
    bison: number
  }
  operationsKPIs: {
    avgDaysToDelivery: number
    avgDaysToTechSetup: number
    avgDaysToSequences: number
    deliveryTrend: 'up' | 'down' | 'flat'
    monthlyData: {
      month: string
      daysToDelivery: number
      daysToTechSetup: number
      daysToSequences: number
    }[]
  }
  mailboxHealth: {
    total: number
    healthy: number
    warning: number
    critical: number
    instantly: number
    bison: number
    readyToLaunchPercent: number
  }
  submissions: {
    total: number
    pending: number
    approved: number
    rejected: number
    launched: number
    recentSubmissions: {
      id: string
      clientName: string
      status: string
      submittedAt: string
      platform: string
    }[]
  }
  atRiskClients: AtRiskClient[]
  clientHealth: ClientHealth
  actionRequired: ActionRequired
  longestWaiting: LongestWaiting | null
  deliverySLA: DeliverySLA
  clientPerformance: { top5: ClientPerformance[], bottom5: ClientPerformance[] }
}

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  launched: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Rocket }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchDashboard = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch(`/api/dashboard${refresh ? '?refresh=true' : ''}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchDashboard(true), 60000)
    return () => clearInterval(interval)
  }, [])

  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    }
    if (diffHours < 48) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'flat' }) => {
    if (trend === 'down') return <ArrowDownRight className="text-emerald-500" size={16} />
    if (trend === 'up') return <ArrowUpRight className="text-red-500" size={16} />
    return <Minus className="text-gray-400" size={16} />
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Customer Success Dashboard" description="Loading command center..." />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
            <p className="text-gray-500">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header title="Customer Success Dashboard" description="Command center" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <p className="text-gray-900 font-medium">Failed to load dashboard</p>
            <Button onClick={() => fetchDashboard()} className="mt-4">
              <RefreshCw size={16} className="mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        title="Customer Success Dashboard" 
        description="Director's view — client health & delivery performance"
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Top bar with refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Data</span>
            {lastUpdated && (
              <span className="text-gray-400">• Updated {formatRelativeTime(lastUpdated)}</span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Operations KPIs - Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Avg Days: Intake → Delivery</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-4xl font-bold">{data.operationsKPIs.avgDaysToDelivery}</p>
                    <span className="text-blue-200 text-lg">days</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  data.operationsKPIs.deliveryTrend === 'down' 
                    ? 'bg-emerald-400/20 text-emerald-100' 
                    : data.operationsKPIs.deliveryTrend === 'up'
                    ? 'bg-red-400/20 text-red-100'
                    : 'bg-white/20 text-white'
                }`}>
                  <TrendIcon trend={data.operationsKPIs.deliveryTrend} />
                  {data.operationsKPIs.deliveryTrend === 'down' ? 'Improving' : 
                   data.operationsKPIs.deliveryTrend === 'up' ? 'Needs attention' : 'Stable'}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-blue-100 text-sm">
                <div className="flex items-center gap-1">
                  <Timer size={14} />
                  <span>Tech Setup: {data.operationsKPIs.avgDaysToTechSetup}d</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap size={14} />
                  <span>Sequences: {data.operationsKPIs.avgDaysToSequences}d</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Health Overview - replaces Total Clients */}
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Client Health Overview</p>
                  <p className="text-4xl font-bold mt-1">{data.clients.total}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Users size={24} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-purple-100">{data.clientHealth.healthy} Healthy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-purple-100">{data.clientHealth.needsAttention} Attention</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-purple-100">{data.clientHealth.atRisk} At Risk</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Client Performance Leaderboard */}
        <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="text-amber-500" size={20} />
                Client Performance
              </CardTitle>
              <CardDescription>Top & bottom performers by response rate</CardDescription>
            </CardHeader>
            <CardContent>
              {data.clientPerformance.top5.length === 0 && data.clientPerformance.bottom5.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="mx-auto mb-2 text-gray-300" size={40} />
                  <p className="text-sm">Performance data not yet available</p>
                  <p className="text-xs text-gray-400 mt-1">Campaign stats will appear once active</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Performers */}
                  {data.clientPerformance.top5.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-2">Top Performers</p>
                      <div className="space-y-2">
                        {data.clientPerformance.top5.map((client, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{client.clientName}</span>
                                <span className="text-sm font-bold text-emerald-600">{client.responseRate}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(client.responseRate * 5, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Performers */}
                  {data.clientPerformance.bottom5.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-2">Needs Attention</p>
                      <div className="space-y-2">
                        {data.clientPerformance.bottom5.map((client, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                              !
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{client.clientName}</span>
                                <span className="text-sm font-bold text-red-600">{client.responseRate}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                                <div 
                                  className="h-full bg-red-400 rounded-full"
                                  style={{ width: `${Math.min(client.responseRate * 5, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
        </Card>

        {/* Delivery Performance Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="text-emerald-500" size={20} />
              Delivery Performance Trend
            </CardTitle>
            <CardDescription>Month over month performance (lower is better)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.operationsKPIs.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="daysToDelivery" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    name="Days to Delivery"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="daysToTechSetup" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                    name="Days to Tech Setup"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="daysToSequences" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2 }}
                    name="Days to Sequences"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Communications */}
        <ClientCommunications />

        {/* AI Insights + Recent Submissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyInsights />

          <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Inbox className="text-purple-500" size={20} />
                  Recent Submissions
                </CardTitle>
                <CardDescription>Latest client submission activity</CardDescription>
              </div>
              <Link href="/submissions">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.submissions.recentSubmissions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Inbox className="mx-auto mb-2 text-gray-300" size={32} />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {data.submissions.recentSubmissions.map((submission) => {
                  const config = STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG]
                  const Icon = config?.icon || Clock

                  return (
                    <div 
                      key={submission.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        submission.status === 'pending' ? 'bg-amber-100' :
                        submission.status === 'approved' ? 'bg-emerald-100' :
                        submission.status === 'rejected' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        <Icon size={16} className={
                          submission.status === 'pending' ? 'text-amber-600' :
                          submission.status === 'approved' ? 'text-emerald-600' :
                          submission.status === 'rejected' ? 'text-red-600' :
                          'text-blue-600'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {submission.clientName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="capitalize">{submission.platform}</span>
                          <span>•</span>
                          <span>{formatDate(submission.submittedAt)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${config?.color}`}>
                        {submission.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Footer timestamp */}
        <div className="text-center text-sm text-gray-400 pt-4">
          <Calendar className="inline-block mr-1.5" size={14} />
          Last data sync: {new Date(data.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
