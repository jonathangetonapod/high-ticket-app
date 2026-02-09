'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  RefreshCw, 
  Loader2, 
  Users, 
  AlertTriangle, 
  Clock, 
  Mail,
  CheckCircle,
  XCircle,
  Hash
} from 'lucide-react'

interface RecentEmail {
  from: string
  subject: string
  date: string
  snippet: string
}

interface HealthScore {
  total: number
  bracket: 'healthy' | 'needs_attention' | 'at_risk'
  components: {
    recency: number
    volume: number
    trend: number
    multiChannel: number
  }
  trend: 'up' | 'down' | 'stable'
}

interface ClientCommunication {
  id: string
  client_name: string
  platform: string
  last_email_date: string | null
  last_email_subject: string | null
  last_email_from: string | null
  emails_7d: number
  emails_30d: number
  meetings_7d: number
  unreplied_count: number
  days_since_contact: number
  status: string
  updated_at: string
  // Slack fields
  slack_channel: string | null
  last_slack_date: string | null
  slack_messages_7d: number
  last_slack_from: string | null
  // Health score
  health_score?: HealthScore
  // Extended details
  recent_emails?: RecentEmail[]
  email_snippet?: string
  recent_senders?: string[]
}

interface Stats {
  totalClients: number
  activeClients: number
  needsAttention: number
  critical: number
  avgDaysSinceContact: number
  noEmail7d?: number
  noSlack7d?: number
  noContact7d?: number
  // Health stats
  healthyCount?: number
  needsAttentionCount?: number
  atRiskCount?: number
  avgHealthScore?: number
  totalUnreplied?: number
}

// Health score badge colors
function getHealthBadge(score: number, bracket: string) {
  if (bracket === 'healthy' || score >= 71) {
    return { label: score.toString(), className: 'bg-green-100 text-green-700 border-green-300', emoji: '🟢' }
  }
  if (bracket === 'needs_attention' || score >= 41) {
    return { label: score.toString(), className: 'bg-amber-100 text-amber-700 border-amber-300', emoji: '🟡' }
  }
  return { label: score.toString(), className: 'bg-red-100 text-red-700 border-red-300', emoji: '🔴' }
}

function getTrendIcon(trend: string) {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}

function getStatusBadge(status: string, daysSince: number) {
  if (status === 'critical' || daysSince >= 14) {
    return { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (status === 'warning' || daysSince >= 7) {
    return { label: 'Needs Attention', className: 'bg-amber-100 text-amber-700 border-amber-200' }
  }
  return { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' }
}

function getPlatformBadge(platform: string) {
  if (platform === 'instantly') {
    return { label: 'Instantly', className: 'bg-blue-500 text-white' }
  }
  if (platform === 'bison') {
    return { label: 'Bison', className: 'bg-amber-500 text-white' }
  }
  return { label: platform, className: 'bg-gray-500 text-white' }
}

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  iconBg, 
  iconColor,
  loading 
}: { 
  label: string
  value: number
  icon: any
  iconBg: string
  iconColor: string
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={iconColor} size={20} />
        </div>
        <div className="flex-1">
          {loading ? (
            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Try to parse extended email data from last_email_from field
function parseExtendedData(fromField: string | null): {
  from: string | null
  senders: string[]
  snippet: string | null
  recent: Array<{ subject: string; from: string; date: string; snippet?: string }>
} | null {
  if (!fromField) return null
  try {
    if (fromField.startsWith('{')) {
      return JSON.parse(fromField)
    }
  } catch {
    // Not JSON, just a plain email
  }
  return null
}

function ClientRow({ client }: { client: ClientCommunication }) {
  const [expanded, setExpanded] = useState(false)
  const statusBadge = getStatusBadge(client.status, client.days_since_contact)
  const platformBadge = getPlatformBadge(client.platform)
  
  // Parse extended data if available
  const extendedData = parseExtendedData(client.last_email_from)
  const displayFrom = extendedData?.from || client.last_email_from

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
      client.days_since_contact >= 14 ? 'border-red-200 bg-red-50/30' :
      client.days_since_contact >= 7 ? 'border-amber-200 bg-amber-50/30' : ''
    }`} onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
            client.days_since_contact >= 14 ? 'bg-red-500' :
            client.days_since_contact >= 7 ? 'bg-amber-500' : 
            'bg-gradient-to-br from-gray-700 to-gray-900'
          }`}>
            {getInitials(client.client_name)}
          </div>

          {/* Client Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {client.client_name}
              </span>
              <Badge className={`text-xs ${platformBadge.className}`}>
                {platformBadge.label}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
                {statusBadge.label}
              </Badge>
              {client.slack_channel && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Hash size={10} className="mr-1" />
                  {client.slack_channel}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {client.last_email_subject && (
                <span className="flex items-center gap-1 truncate max-w-md">
                  <Mail size={12} />
                  {client.last_email_subject}
                </span>
              )}
              {client.last_slack_from && (
                <span className="flex items-center gap-1">
                  <Hash size={12} />
                  {client.last_slack_from}
                </span>
              )}
            </div>
          </div>

          {/* Stats - Health Score + Activity */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            {/* Health Score */}
            {client.health_score && (
              <div className="text-center" title={`Health: ${client.health_score.bracket}`}>
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                  client.health_score.bracket === 'healthy' ? 'bg-green-100 text-green-700' :
                  client.health_score.bracket === 'needs_attention' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {client.health_score.total}
                  <span className="ml-1">{getTrendIcon(client.health_score.trend)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">health</p>
              </div>
            )}
            
            {/* Unreplied Count */}
            {client.unreplied_count > 0 && (
              <div className="text-center" title="Unreplied emails">
                <div className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                  {client.unreplied_count}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">unreplied</p>
              </div>
            )}
            
            <div className="text-center" title="Emails in last 30 days">
              <p className="font-semibold text-gray-900 flex items-center justify-center gap-1">
                <Mail size={12} className="text-gray-400" />
                {client.emails_30d || 0}
              </p>
              <p className="text-xs text-gray-500">30d</p>
            </div>
            <div className="text-center" title="Emails in last 7 days">
              <p className="font-semibold text-gray-900 flex items-center justify-center gap-1">
                {client.emails_7d}
              </p>
              <p className="text-xs text-gray-500">7d</p>
            </div>
            <div className="text-center" title="Slack messages (7d)">
              <p className="font-semibold text-gray-900 flex items-center justify-center gap-1">
                <Hash size={12} className="text-gray-400" />
                {client.slack_messages_7d || 0}
              </p>
              <p className="text-xs text-gray-500">slack</p>
            </div>
          </div>

          {/* Last Contact */}
          <div className="text-right flex-shrink-0">
            <div className={`flex items-center gap-1 text-sm font-medium ${
              client.days_since_contact >= 14 ? 'text-red-600' :
              client.days_since_contact >= 7 ? 'text-amber-600' : 
              'text-gray-600'
            }`}>
              <Clock size={14} />
              {client.days_since_contact === 999 ? 'Never' : 
               client.days_since_contact === 0 ? 'Today' :
               `${client.days_since_contact}d ago`}
            </div>
            <p className="text-xs text-gray-400">
              {getRelativeTime(client.last_email_date)}
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Email Snippet Preview */}
            {extendedData?.snippet && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Latest Email Preview:</p>
                <p className="text-sm text-gray-700 italic">"{extendedData.snippet}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              {/* Recent Emails */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Mail size={14} /> Recent Emails ({client.emails_30d || 0} in 30d)
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-3 max-h-64 overflow-y-auto">
                  {extendedData?.recent && extendedData.recent.length > 0 ? (
                    extendedData.recent.map((email, idx) => (
                      <div key={idx} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-gray-800 text-xs truncate flex-1">
                            {email.subject}
                          </p>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {getRelativeTime(email.date)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{email.from}</p>
                        {email.snippet && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {email.snippet}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      {client.last_email_subject && (
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{client.last_email_subject}</p>
                          <p className="text-xs text-gray-500">{displayFrom}</p>
                          <p className="text-xs text-gray-400">{getRelativeTime(client.last_email_date)}</p>
                        </div>
                      )}
                      {!client.last_email_subject && (
                        <p className="text-gray-400 italic text-xs">No emails found</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right column: Senders + Slack */}
              <div className="space-y-4">
                {/* Recent Senders */}
                {extendedData?.senders && extendedData.senders.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 text-xs">Recent Senders</h4>
                    <div className="flex flex-wrap gap-1">
                      {extendedData.senders.map((sender, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs truncate max-w-48">
                          {sender.split('<')[0].trim() || sender}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slack Details */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <Hash size={14} /> Slack
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {client.slack_channel ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Channel:</span>
                          <span className="font-medium">#{client.slack_channel}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Messages (7d):</span>
                          <span className="font-medium">{client.slack_messages_7d || 0}</span>
                        </div>
                        {client.last_slack_from && (
                          <div className="text-xs">
                            <span className="text-gray-500">Last from: </span>
                            <span className="font-medium">{client.last_slack_from}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 italic text-xs">No Slack channel</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap gap-2 text-xs pt-2 border-t border-gray-100">
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                {client.platform}
              </span>
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                {client.emails_7d} emails this week
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                Updated {getRelativeTime(client.updated_at)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ClientRowSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-16 bg-gray-100 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ClientCommunications() {
  const [communications, setCommunications] = useState<ClientCommunication[]>([])
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    activeClients: 0,
    needsAttention: 0,
    critical: 0,
    avgDaysSinceContact: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('health')

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('filter', filter)
      
      const response = await fetch(`/api/client-communications?${params}`)
      const data = await response.json()

      if (data.success) {
        setCommunications(data.communications || [])
        setStats(data.stats || {
          totalClients: 0,
          activeClients: 0,
          needsAttention: 0,
          critical: 0,
          avgDaysSinceContact: 0
        })
      }
    } catch (error) {
      console.error('Error loading client communications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const triggerRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/client-communications', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        // Reload data after refresh
        await loadData()
      } else {
        console.error('Refresh failed:', data.error)
      }
    } catch (error) {
      console.error('Error triggering refresh:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter])

  return (
    <div className="space-y-6">
      {/* Health Distribution Banner */}
      {!loading && stats.avgHealthScore !== undefined && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{stats.avgHealthScore}</div>
                  <div className="text-xs text-gray-500">Avg Health Score</div>
                </div>
                <div className="h-10 w-px bg-gray-300" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm"><strong>{stats.healthyCount || 0}</strong> Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm"><strong>{stats.needsAttentionCount || 0}</strong> Attention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm"><strong>{stats.atRiskCount || 0}</strong> At Risk</span>
                  </div>
                </div>
              </div>
              {stats.totalUnreplied && stats.totalUnreplied > 0 && (
                <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  ⚠️ {stats.totalUnreplied} unreplied emails
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={stats.totalClients}
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading}
        />
        <StatCard
          label="Active (7d)"
          value={stats.activeClients}
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          loading={loading}
        />
        <StatCard
          label="Needs Attention"
          value={stats.needsAttention}
          icon={AlertTriangle}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          loading={loading}
        />
        <StatCard
          label="Critical (14d+)"
          value={stats.critical}
          icon={XCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          loading={loading}
        />
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="needs_attention">Needs Attention (7d+)</SelectItem>
                  <SelectItem value="at_risk">🔴 At Risk (Health &lt;41)</SelectItem>
                  <SelectItem value="has_unreplied">⚠️ Has Unreplied</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health Score ↑</SelectItem>
                  <SelectItem value="health_desc">Health Score ↓</SelectItem>
                  <SelectItem value="days">Days Since Contact</SelectItem>
                  <SelectItem value="emails">Email Activity</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-sm text-gray-500">
                {communications.length} {communications.length === 1 ? 'client' : 'clients'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={triggerRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Scanning Emails...
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail size={20} />
          Team ↔ Client Communications
        </h2>
        
        {loading ? (
          <div className="space-y-3">
            <ClientRowSkeleton />
            <ClientRowSkeleton />
            <ClientRowSkeleton />
            <ClientRowSkeleton />
          </div>
        ) : communications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Mail className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500 font-medium">No communication data yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Click "Refresh Data" to scan emails for all clients
              </p>
              <Button
                className="mt-4"
                onClick={triggerRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} className="mr-2" />
                    Scan Emails Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {communications
              // Filter
              .filter(client => {
                if (filter === 'at_risk') return client.health_score?.bracket === 'at_risk'
                if (filter === 'has_unreplied') return (client.unreplied_count || 0) > 0
                return true // 'all' and 'needs_attention' handled by API
              })
              // Sort
              .sort((a, b) => {
                if (sortBy === 'health') return (a.health_score?.total || 0) - (b.health_score?.total || 0)
                if (sortBy === 'health_desc') return (b.health_score?.total || 0) - (a.health_score?.total || 0)
                if (sortBy === 'days') return (b.days_since_contact || 0) - (a.days_since_contact || 0)
                if (sortBy === 'emails') return (b.emails_30d || 0) - (a.emails_30d || 0)
                if (sortBy === 'name') return a.client_name.localeCompare(b.client_name)
                return 0
              })
              .map((client) => (
                <ClientRow key={client.id || client.client_name} client={client} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
