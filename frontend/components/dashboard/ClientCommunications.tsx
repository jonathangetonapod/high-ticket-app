'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageSquare, 
  Mail, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Users,
  ChevronRight,
  Hash
} from 'lucide-react'

interface ClientComm {
  id: string
  client_name: string
  platform: string
  // Email fields
  last_email_date: string | null
  last_email_subject: string | null
  last_email_from: string | null
  emails_7d: number
  emails_30d: number
  // Slack fields
  slack_channel: string | null
  last_slack_date: string | null
  slack_messages_7d: number
  last_slack_from: string | null
  // Combined
  days_since_contact: number
  status: string
  updated_at: string
}

interface Stats {
  totalClients: number
  activeClients: number
  needsAttention: number
  critical: number
  avgDaysSinceContact: number
  noEmail7d: number
  noSlack7d: number
  noContact7d: number
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-600'
}

export function ClientCommunications() {
  const [communications, setCommunications] = useState<ClientComm[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCommunications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client-communications')
      const data = await response.json()
      
      if (data.success) {
        setCommunications(data.communications)
        setStats(data.stats)
      } else {
        setError(data.error || 'Failed to load communications')
      }
    } catch (err) {
      setError('Failed to fetch communications')
    } finally {
      setLoading(false)
    }
  }

  const triggerRefresh = async () => {
    try {
      setRefreshing(true)
      setError(null)
      const response = await fetch('/api/client-communications', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        // Re-fetch to get updated data
        await fetchCommunications()
      } else {
        setError(data.error || 'Refresh failed')
      }
    } catch (err) {
      setError('Failed to refresh communications')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCommunications()
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getLastContact = (comm: ClientComm) => {
    const emailDate = comm.last_email_date ? new Date(comm.last_email_date) : null
    const slackDate = comm.last_slack_date ? new Date(comm.last_slack_date) : null
    
    if (emailDate && slackDate) {
      return emailDate > slackDate 
        ? { type: 'email' as const, date: emailDate }
        : { type: 'slack' as const, date: slackDate }
    }
    if (emailDate) return { type: 'email' as const, date: emailDate }
    if (slackDate) return { type: 'slack' as const, date: slackDate }
    return null
  }

  // Check if no activity in 7 days
  const noEmailIn7Days = (comm: ClientComm) => {
    if (!comm.last_email_date) return true
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(comm.last_email_date) < sevenDaysAgo
  }

  const noSlackIn7Days = (comm: ClientComm) => {
    if (!comm.last_slack_date) return true
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(comm.last_slack_date) < sevenDaysAgo
  }

  // Sort by status priority: critical > warning > active
  const sortedComms = [...communications].sort((a, b) => {
    const priority: Record<string, number> = { critical: 0, warning: 1, active: 2, unknown: 3 }
    return (priority[a.status] ?? 3) - (priority[b.status] ?? 3)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="text-blue-500" size={20} />
              Client Communications
            </CardTitle>
            <CardDescription>Email & Slack activity per client</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-xs text-gray-500">Total Clients</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.noContact7d}</p>
              <p className="text-xs text-gray-500">No Contact 7d</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.noEmail7d}</p>
              <p className="text-xs text-gray-500">No Email 7d</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.noSlack7d}</p>
              <p className="text-xs text-gray-500">No Slack 7d</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && communications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="animate-spin mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm">Loading communications...</p>
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="font-medium text-gray-700">No communication data yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Click Refresh to scan emails and Slack
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sortedComms.slice(0, 15).map((comm) => {
              const lastContact = getLastContact(comm)
              const noEmail = noEmailIn7Days(comm)
              const noSlack = noSlackIn7Days(comm)

              return (
                <div
                  key={comm.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    comm.status === 'critical' ? 'bg-red-500' :
                    comm.status === 'warning' ? 'bg-amber-500' :
                    'bg-green-500'
                  }`} />

                  {/* Client info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {comm.client_name}
                      </p>
                      {comm.status !== 'active' && (
                        <Badge className={STATUS_COLORS[comm.status]} variant="secondary">
                          {comm.status}
                        </Badge>
                      )}
                    </div>

                    {/* Communication channels */}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {/* Email */}
                      <span className={`flex items-center gap-1 ${noEmail ? 'text-red-500' : ''}`}>
                        <Mail size={12} />
                        {comm.emails_7d > 0 ? `${comm.emails_7d} in 7d` : 'No email 7d'}
                      </span>

                      {/* Slack */}
                      <span className={`flex items-center gap-1 ${noSlack ? 'text-amber-500' : ''}`}>
                        <Hash size={12} />
                        {comm.slack_channel ? (
                          comm.slack_messages_7d > 0 
                            ? `${comm.slack_messages_7d} in 7d` 
                            : 'No Slack 7d'
                        ) : (
                          <span className="text-gray-400">No channel</span>
                        )}
                      </span>

                      {/* Last contact */}
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {lastContact ? (
                          <>
                            {lastContact.type === 'email' ? '📧' : '💬'}
                            {formatDate(lastContact.date.toISOString())}
                          </>
                        ) : (
                          'Never'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Alert badges */}
                  <div className="flex items-center gap-1 shrink-0">
                    {noEmail && noSlack && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                        No contact 7d
                      </Badge>
                    )}
                    {noEmail && !noSlack && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                        No email 7d
                      </Badge>
                    )}
                    {!noEmail && noSlack && comm.slack_channel && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                        No Slack 7d
                      </Badge>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </div>
              )
            })}
          </div>
        )}

        {communications.length > 15 && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Showing 15 of {communications.length} clients
          </p>
        )}
      </CardContent>
    </Card>
  )
}
