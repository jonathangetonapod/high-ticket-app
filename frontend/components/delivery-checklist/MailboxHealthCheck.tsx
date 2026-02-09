'use client'

import { useState, useMemo } from 'react'
import {
  Settings,
  Loader2,
  Info,
  CheckCircle,
  AlertTriangle,
  Mail,
  XCircle,
  Flame,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ValidationResult } from './types'

interface MailboxHealth {
  email: string
  clientName: string
  platform: 'instantly' | 'bison'
  status: 'healthy' | 'warning' | 'critical'
  warmupScore?: number
  warmupStatus?: string
  issues: string[]
  // Instantly-specific
  warmupStarted?: string
  providerName?: string
  dailyLimit?: number
  // Bison-specific
  bisonId?: number
  warmupEnabled?: boolean
  warmupEmailsSent?: number
  warmupRepliesReceived?: number
  warmupBouncesCaused?: number
}

interface MailboxHealthResponse {
  success: boolean
  summary: {
    total: number
    healthy: number
    warning: number
    critical: number
    instantly: number
    bison: number
    clientCount: number
  }
  mailboxes: MailboxHealth[]
  cached?: boolean
  cacheAge?: number
}

interface MailboxHealthCheckProps {
  clientId: string
  clientName: string
  platform: string
  validation: ValidationResult
  onValidate: () => void
  getValidationCard: (validation: ValidationResult) => React.ReactNode
}

export function MailboxHealthCheck({
  clientId,
  clientName,
  platform,
  validation,
  onValidate,
  getValidationCard
}: MailboxHealthCheckProps) {
  const [mailboxes, setMailboxes] = useState<MailboxHealth[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; cacheAge?: number } | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all')
  const [showAll, setShowAll] = useState(false)

  const loadMailboxes = async (forceRefresh = false) => {
    if (!clientName) return

    try {
      setLoading(true)
      const url = forceRefresh ? '/api/mailbox-health?refresh=true' : '/api/mailbox-health'
      const response = await fetch(url)
      const data: MailboxHealthResponse = await response.json()

      if (data.success) {
        // Filter for this client only
        const clientMailboxes = data.mailboxes.filter(
          m => m.clientName.toLowerCase() === clientName.toLowerCase()
        )
        setMailboxes(clientMailboxes)
        setCacheInfo({ cached: data.cached || false, cacheAge: data.cacheAge })
        setLoaded(true)
      }
    } catch (error) {
      console.error('Error loading mailboxes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Computed stats
  const stats = useMemo(() => {
    const total = mailboxes.length
    const healthy = mailboxes.filter(m => m.status === 'healthy').length
    const warning = mailboxes.filter(m => m.status === 'warning').length
    const critical = mailboxes.filter(m => m.status === 'critical').length
    
    const notEnabled = mailboxes.filter(m => 
      m.issues.some(i => i.toLowerCase().includes('warmup not enabled'))
    ).length
    
    const stillWarming = mailboxes.filter(m => 
      m.issues.some(i => i.toLowerCase().includes('warmup not completed'))
    ).length

    const readyPercent = total > 0 ? Math.round((healthy / total) * 100) : 0
    const readyToLaunch = readyPercent >= 80 && notEnabled === 0 && stillWarming === 0

    return { total, healthy, warning, critical, notEnabled, stillWarming, readyPercent, readyToLaunch }
  }, [mailboxes])

  // Filtered mailboxes
  const filteredMailboxes = useMemo(() => {
    let filtered = mailboxes
    if (filter === 'critical') filtered = mailboxes.filter(m => m.status === 'critical')
    if (filter === 'warning') filtered = mailboxes.filter(m => m.status === 'warning')
    if (filter === 'healthy') filtered = mailboxes.filter(m => m.status === 'healthy')
    
    // Sort: critical first, then warning, then healthy
    return filtered.sort((a, b) => {
      const order = { critical: 0, warning: 1, healthy: 2 }
      return order[a.status] - order[b.status]
    })
  }, [mailboxes, filter])

  const displayedMailboxes = showAll ? filteredMailboxes : filteredMailboxes.slice(0, 5)

  const isPlatformSupported = platform === 'bison' || platform === 'instantly'

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings size={20} className="text-gray-700" />
          </div>
          Mailbox Health Check
        </CardTitle>
        <CardDescription>
          Validate mailbox warmup status and sending readiness for {clientName || 'selected client'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!clientId && (
          <Card className="bg-amber-50/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  Please select a client in Step 1 first
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {clientId && !isPlatformSupported && (
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  Mailbox health check is not available for platform: {platform}. 
                  Supported platforms: Bison, Instantly.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {clientId && isPlatformSupported && (
          <div className="space-y-4">
            {/* Load Button */}
            <div className="flex gap-2">
              <Button
                onClick={() => loadMailboxes(false)}
                disabled={loading}
                className="flex-1 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Loading Mailboxes...
                  </>
                ) : loaded ? (
                  <>
                    <Mail size={18} />
                    Reload Mailbox Status
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Check Mailbox Status
                  </>
                )}
              </Button>
              {loaded && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => loadMailboxes(true)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {cacheInfo?.cached ? `${cacheInfo.cacheAge}s` : ''}
                </Button>
              )}
            </div>

            {/* Results */}
            {loaded && (
              <div className="space-y-4">
                {mailboxes.length === 0 ? (
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-6 text-center">
                      <Mail className="mx-auto h-12 w-12 text-amber-400 mb-3" />
                      <p className="font-semibold text-amber-900">No Mailboxes Found</p>
                      <p className="text-sm text-amber-700 mt-1">
                        No mailboxes are configured for {clientName}. Infrastructure setup may be pending.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Ready to Launch Banner */}
                    <Card className={`border-2 ${stats.readyToLaunch ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {stats.readyToLaunch ? (
                              <CheckCircle className="h-8 w-8 text-emerald-600" />
                            ) : (
                              <XCircle className="h-8 w-8 text-rose-600" />
                            )}
                            <div>
                              <p className={`font-bold text-lg ${stats.readyToLaunch ? 'text-emerald-900' : 'text-rose-900'}`}>
                                {stats.readyToLaunch ? '✅ Ready to Launch' : '❌ Not Ready to Launch'}
                              </p>
                              <p className={`text-sm ${stats.readyToLaunch ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {stats.readyToLaunch 
                                  ? 'All mailboxes are warmed up and healthy'
                                  : stats.notEnabled > 0 
                                    ? `${stats.notEnabled} mailbox${stats.notEnabled > 1 ? 'es have' : ' has'} warmup not enabled`
                                    : stats.stillWarming > 0
                                      ? `${stats.stillWarming} mailbox${stats.stillWarming > 1 ? 'es are' : ' is'} still warming up`
                                      : `Only ${stats.readyPercent}% healthy (need 80%+)`
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold">
                              {stats.readyPercent}%
                            </div>
                            <div className="text-sm text-gray-600">Ready</div>
                          </div>
                        </div>
                        <Progress 
                          value={stats.readyPercent} 
                          className={`h-2 mt-3 ${stats.readyToLaunch ? '[&>div]:bg-emerald-500' : '[&>div]:bg-rose-500'}`} 
                        />
                      </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Mail className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                          <div className="text-2xl font-bold">{stats.total}</div>
                          <div className="text-xs text-gray-600">Total Mailboxes</div>
                        </CardContent>
                      </Card>
                      <Card className={stats.notEnabled > 0 ? 'bg-rose-50 border-rose-200' : ''}>
                        <CardContent className="p-4 text-center">
                          <XCircle className={`h-5 w-5 mx-auto mb-1 ${stats.notEnabled > 0 ? 'text-rose-500' : 'text-gray-400'}`} />
                          <div className={`text-2xl font-bold ${stats.notEnabled > 0 ? 'text-rose-600' : ''}`}>
                            {stats.notEnabled}
                          </div>
                          <div className="text-xs text-gray-600">Not Enabled</div>
                        </CardContent>
                      </Card>
                      <Card className={stats.stillWarming > 0 ? 'bg-orange-50 border-orange-200' : ''}>
                        <CardContent className="p-4 text-center">
                          <Flame className={`h-5 w-5 mx-auto mb-1 ${stats.stillWarming > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                          <div className={`text-2xl font-bold ${stats.stillWarming > 0 ? 'text-orange-600' : ''}`}>
                            {stats.stillWarming}
                          </div>
                          <div className="text-xs text-gray-600">Still Warming</div>
                        </CardContent>
                      </Card>
                      <Card className={stats.healthy === stats.total ? 'bg-emerald-50 border-emerald-200' : ''}>
                        <CardContent className="p-4 text-center">
                          <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${stats.healthy === stats.total ? 'text-emerald-500' : 'text-gray-400'}`} />
                          <div className={`text-2xl font-bold ${stats.healthy === stats.total ? 'text-emerald-600' : ''}`}>
                            {stats.healthy}
                          </div>
                          <div className="text-xs text-gray-600">Healthy</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Filter Tabs */}
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                      <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="all">
                          All ({stats.total})
                        </TabsTrigger>
                        <TabsTrigger value="critical" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">
                          🚫 Critical ({stats.critical})
                        </TabsTrigger>
                        <TabsTrigger value="warning" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
                          ⚠️ Warning ({stats.warning})
                        </TabsTrigger>
                        <TabsTrigger value="healthy" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
                          ✅ Healthy ({stats.healthy})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {/* Mailbox List */}
                    <div className="space-y-2">
                      {displayedMailboxes.map((m, i) => (
                        <Card 
                          key={i} 
                          className={`
                            ${m.status === 'critical' ? 'bg-rose-50 border-rose-300' : ''}
                            ${m.status === 'warning' ? 'bg-orange-50 border-orange-300' : ''}
                            ${m.status === 'healthy' ? 'bg-emerald-50 border-emerald-300' : ''}
                          `}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    variant="secondary" 
                                    className={`
                                      ${m.status === 'critical' ? 'bg-rose-600 text-white' : ''}
                                      ${m.status === 'warning' ? 'bg-orange-600 text-white' : ''}
                                      ${m.status === 'healthy' ? 'bg-emerald-600 text-white' : ''}
                                    `}
                                  >
                                    {m.status === 'critical' && '🚫 Critical'}
                                    {m.status === 'warning' && '⚠️ Warning'}
                                    {m.status === 'healthy' && '✅ Healthy'}
                                  </Badge>
                                  <Badge variant="outline">{m.platform}</Badge>
                                  {m.providerName && (
                                    <Badge variant="outline" className="text-xs">{m.providerName}</Badge>
                                  )}
                                </div>
                                <p className="font-medium mt-2 truncate">{m.email}</p>
                                
                                {/* Issues */}
                                {m.issues.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {m.issues.map((issue, idx) => (
                                      <p key={idx} className={`text-sm ${m.status === 'critical' ? 'text-rose-700' : 'text-orange-700'}`}>
                                        {issue}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Stats Row */}
                                <div className="flex gap-4 mt-2 text-xs text-gray-600">
                                  {m.warmupEmailsSent !== undefined && (
                                    <span>📧 {m.warmupEmailsSent} emails sent</span>
                                  )}
                                  {m.warmupRepliesReceived !== undefined && (
                                    <span>💬 {m.warmupRepliesReceived} replies</span>
                                  )}
                                  {m.dailyLimit && (
                                    <span>📊 {m.dailyLimit}/day limit</span>
                                  )}
                                </div>
                              </div>

                              {/* Score Badge */}
                              <div className={`
                                w-16 h-16 rounded-lg flex flex-col items-center justify-center flex-shrink-0
                                ${m.status === 'critical' ? 'bg-rose-100' : ''}
                                ${m.status === 'warning' ? 'bg-orange-100' : ''}
                                ${m.status === 'healthy' ? 'bg-emerald-100' : ''}
                              `}>
                                <div className={`text-xl font-bold ${
                                  (m.warmupScore || 0) >= 70 ? 'text-emerald-700' :
                                  (m.warmupScore || 0) >= 40 ? 'text-orange-700' : 'text-rose-700'
                                }`}>
                                  {m.warmupScore ?? '—'}
                                </div>
                                <div className="text-xs text-gray-600">Score</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Show More/Less Button */}
                      {filteredMailboxes.length > 5 && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => setShowAll(!showAll)}
                        >
                          {showAll ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show All {filteredMailboxes.length} Mailboxes
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Validate Button */}
        <Button
          onClick={onValidate}
          disabled={!clientId || validation.status === 'validating'}
          className="w-full shadow-lg"
          size="lg"
        >
          {validation.status === 'validating' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Checking Infrastructure...
            </>
          ) : (
            <>
              <Settings size={20} />
              Validate Infrastructure
            </>
          )}
        </Button>

        {getValidationCard(validation)}
      </CardContent>
    </Card>
  )
}
