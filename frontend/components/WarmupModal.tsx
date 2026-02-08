'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Mail,
  Calendar,
  TrendingUp,
  Zap,
  Clock,
  BarChart3,
  Activity,
  ArrowRight,
  Flame
} from 'lucide-react'

interface WarmupAccount {
  email: string
  status: 'healthy' | 'warning' | 'critical' | 'inactive'
  issues: string[]
  
  // Common fields
  warmup_score?: number
  healthScore?: number
  totalSent?: number
  warmup_emails_sent?: number
  warmupAgeDays?: number | null
  warmup_age_days?: number | null
  warmupStartDate?: string | null
  warmup_start_date?: string | null
  dailyAvgSent?: number
  daily_avg_sent?: number
  readyToSend?: boolean
  ready_to_send?: boolean
  daysUntilReady?: number | null
  days_until_ready?: number | null
  
  // Instantly specific
  inboxRate?: number
  totalInbox?: number
  totalSpam?: number
  warmupLimit?: number | null
  replyRate?: number | null
  dailyData?: Array<{
    date: string
    sent: number
    landed_inbox: number
    landed_spam: number
  }>
  
  // Bison specific
  warmup_enabled?: boolean
  warmup_replies_received?: number
  warmup_emails_saved_from_spam?: number
  warmup_bounces_caused_count?: number
  warmup_daily_limit?: number | null
  reply_rate?: number
}

interface WarmupSummary {
  totalEmails?: number
  totalAccounts?: number
  healthy: number
  warning: number
  critical: number
  inactive: number
  readyToSend: number
  avgHealthScore?: number
  avgScore?: number
  avgWarmupAge?: number
  avgDailyEmails?: number
  avgInboxRate?: number
  avgReplyRate?: number
  totalWarmupEmailsSent?: number
  totalWarmupSent?: number
  totalReplies?: number
  totalSavedFromSpam?: number
  totalBounces?: number
}

interface WarmupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  platform: 'instantly' | 'bison'
  loading: boolean
  summary: WarmupSummary | null
  accounts: WarmupAccount[]
}

export function WarmupModal({
  open,
  onOpenChange,
  clientName,
  platform,
  loading,
  summary,
  accounts
}: WarmupModalProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(
    accounts.length > 0 ? accounts[0].email : null
  )

  // Normalize account data access
  const getScore = (acc: WarmupAccount) => acc.warmup_score ?? acc.healthScore ?? 0
  const getSent = (acc: WarmupAccount) => acc.warmup_emails_sent ?? acc.totalSent ?? 0
  const getAge = (acc: WarmupAccount) => acc.warmup_age_days ?? acc.warmupAgeDays ?? null
  const getStartDate = (acc: WarmupAccount) => acc.warmup_start_date ?? acc.warmupStartDate ?? null
  const getDailyAvg = (acc: WarmupAccount) => acc.daily_avg_sent ?? acc.dailyAvgSent ?? 0
  const isReady = (acc: WarmupAccount) => acc.ready_to_send ?? acc.readyToSend ?? false
  const getDaysUntilReady = (acc: WarmupAccount) => acc.days_until_ready ?? acc.daysUntilReady ?? null

  const selectedAccount = accounts.find(a => a.email === selectedEmail)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'critical': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={14} className="text-emerald-500" />
      case 'warning': return <AlertTriangle size={14} className="text-amber-500" />
      case 'critical': return <XCircle size={14} className="text-red-500" />
      default: return <XCircle size={14} className="text-gray-400" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {platform === 'instantly' ? (
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="text-blue-600" size={20} />
              </div>
            ) : (
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="text-purple-600" size={20} />
              </div>
            )}
            <div>
              <span className="font-semibold">{clientName}</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {platform}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="animate-spin text-gray-400 mx-auto" size={40} />
              <p className="mt-4 text-gray-500">Loading warmup data...</p>
            </div>
          </div>
        ) : summary ? (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={16} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Accounts</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {summary.totalAccounts ?? summary.totalEmails ?? 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                    <Zap size={12} />
                    <span>{summary.readyToSend} ready to send</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Avg Score</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {summary.avgScore ?? summary.avgHealthScore ?? 0}%
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    {platform === 'instantly' && summary.avgInboxRate && (
                      <><CheckCircle size={12} /><span>{summary.avgInboxRate}% inbox rate</span></>
                    )}
                    {platform === 'bison' && summary.avgReplyRate !== undefined && (
                      <><CheckCircle size={12} /><span>{summary.avgReplyRate}% reply rate</span></>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} className="text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Avg Age</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {summary.avgWarmupAge ?? 0} <span className="text-sm font-normal">days</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                    <Flame size={12} />
                    <span>~{summary.avgDailyEmails ?? 0}/day avg</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame size={16} className="text-gray-600" />
                    <span className="text-xs font-medium text-gray-600">Total Sent</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">
                    {(summary.totalWarmupSent ?? summary.totalWarmupEmailsSent ?? 0).toLocaleString()}
                  </p>
                  {platform === 'bison' && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <span>{summary.totalReplies?.toLocaleString()} replies</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status breakdown bar */}
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Status Distribution</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Ready ({summary.healthy})</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Warning ({summary.warning})</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical ({summary.critical})</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" /> Inactive ({summary.inactive})</span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${(summary.healthy / (summary.totalAccounts ?? summary.totalEmails ?? 1)) * 100}%` }} />
                <div className="bg-amber-500 h-full" style={{ width: `${(summary.warning / (summary.totalAccounts ?? summary.totalEmails ?? 1)) * 100}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${(summary.critical / (summary.totalAccounts ?? summary.totalEmails ?? 1)) * 100}%` }} />
                <div className="bg-gray-400 h-full" style={{ width: `${(summary.inactive / (summary.totalAccounts ?? summary.totalEmails ?? 1)) * 100}%` }} />
              </div>
            </div>

            {/* Account selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Select Account</span>
                <span className="text-xs text-gray-400">{accounts.length} accounts</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                {accounts.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => setSelectedEmail(acc.email)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedEmail === acc.email
                        ? 'bg-gray-900 text-white border-gray-900 ring-2 ring-gray-900 ring-offset-1'
                        : getStatusColor(acc.status)
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {selectedEmail !== acc.email && getStatusIcon(acc.status)}
                      {acc.email.split('@')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected account details */}
            {selectedAccount && (
              <div className="bg-gray-50 rounded-xl p-5 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{selectedAccount.email}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {selectedAccount.issues.map((issue, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            selectedAccount.status === 'critical' ? 'bg-red-100 text-red-700' :
                            selectedAccount.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                            selectedAccount.status === 'inactive' ? 'bg-gray-200 text-gray-600' :
                            'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {issue}
                        </span>
                      ))}
                      {selectedAccount.issues.length === 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
                          ✓ All good
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Readiness indicator */}
                  <div className={`text-center px-5 py-3 rounded-xl ${
                    isReady(selectedAccount) ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                    {isReady(selectedAccount) ? (
                      <>
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Zap size={18} />
                          <span className="font-bold">Ready</span>
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">Good to send</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-amber-700">
                          <Clock size={18} />
                          <span className="font-bold">{getDaysUntilReady(selectedAccount) ?? '?'} days</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1">Until ready</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-500 mb-1">Warmup Score</p>
                    <p className={`text-xl font-bold ${
                      getScore(selectedAccount) >= 70 ? 'text-emerald-600' :
                      getScore(selectedAccount) >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {getScore(selectedAccount)}%
                    </p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          getScore(selectedAccount) >= 70 ? 'bg-emerald-500' :
                          getScore(selectedAccount) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${getScore(selectedAccount)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-500 mb-1">Warmup Age</p>
                    <p className="text-xl font-bold text-gray-800">
                      {getAge(selectedAccount) ?? '?'} <span className="text-sm font-normal text-gray-500">days</span>
                    </p>
                    {getStartDate(selectedAccount) && (
                      <p className="text-xs text-gray-400 mt-1">
                        Started {getStartDate(selectedAccount)}
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-500 mb-1">Emails Sent</p>
                    <p className="text-xl font-bold text-blue-600">
                      {getSent(selectedAccount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ~{getDailyAvg(selectedAccount)}/day avg
                    </p>
                  </div>

                  {platform === 'instantly' && selectedAccount.inboxRate !== undefined && (
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-xs text-gray-500 mb-1">Inbox Rate</p>
                      <p className={`text-xl font-bold ${
                        selectedAccount.inboxRate >= 90 ? 'text-emerald-600' :
                        selectedAccount.inboxRate >= 80 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {selectedAccount.inboxRate}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedAccount.totalInbox?.toLocaleString()} inbox / {selectedAccount.totalSpam?.toLocaleString()} spam
                      </p>
                    </div>
                  )}

                  {platform === 'bison' && (
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-xs text-gray-500 mb-1">Reply Rate</p>
                      <p className="text-xl font-bold text-purple-600">
                        {selectedAccount.reply_rate ?? 0}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedAccount.warmup_replies_received?.toLocaleString()} replies
                      </p>
                    </div>
                  )}
                </div>

                {/* Bison specific stats */}
                {platform === 'bison' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 border text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {selectedAccount.warmup_emails_saved_from_spam?.toLocaleString() ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Saved from Spam</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border text-center">
                      <p className={`text-2xl font-bold ${
                        (selectedAccount.warmup_bounces_caused_count || 0) > 5 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {selectedAccount.warmup_bounces_caused_count ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Bounces Caused</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {selectedAccount.warmup_daily_limit ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500">Daily Limit</p>
                    </div>
                  </div>
                )}

                {/* Instantly day-by-day chart */}
                {platform === 'instantly' && selectedAccount.dailyData && selectedAccount.dailyData.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700">Daily Warmup Activity</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Inbox
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Spam
                        </span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-1" style={{ minWidth: `${selectedAccount.dailyData.length * 36}px` }}>
                        {selectedAccount.dailyData.map((day) => {
                          const maxVal = Math.max(...selectedAccount.dailyData!.map(d => d.sent), 1)
                          const inboxHeight = (day.landed_inbox / maxVal) * 100
                          const spamHeight = ((day.landed_spam || 0) / maxVal) * 100
                          
                          return (
                            <div key={day.date} className="flex flex-col items-center" style={{ minWidth: '32px' }}>
                              <div className="h-16 w-6 bg-gray-100 rounded flex flex-col justify-end overflow-hidden">
                                <div className="w-full bg-red-400" style={{ height: `${spamHeight}%` }} />
                                <div className="w-full bg-emerald-500" style={{ height: `${inboxHeight}%` }} />
                              </div>
                              <p className="text-[10px] font-medium text-gray-600 mt-1">{day.sent}</p>
                              <p className="text-[9px] text-gray-400">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* No data warning for Instantly */}
                {platform === 'instantly' && (!selectedAccount.dailyData || selectedAccount.dailyData.length === 0) && getSent(selectedAccount) === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <XCircle className="mx-auto text-red-400" size={40} />
                    <p className="text-red-700 font-medium mt-3">No Warmup Activity</p>
                    <p className="text-red-600 text-sm mt-1">
                      This mailbox hasn't sent any warmup emails. Warmup may not be enabled.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <XCircle className="mx-auto text-gray-300" size={40} />
            <p className="text-gray-500 mt-3">Failed to load warmup data</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
