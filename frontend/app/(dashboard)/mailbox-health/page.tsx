'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WarmupModal } from '@/components/WarmupModal'
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Mail,
  ChevronDown,
  Download,
  BarChart3,
  Trash2,
  Flame,
  Users,
  TrendingUp
} from 'lucide-react'

interface MailboxHealth {
  email: string
  clientName: string
  platform: 'instantly' | 'bison'
  status: 'healthy' | 'warning' | 'critical'
  warmupScore?: number
  issues: string[]
  providerName?: string
  dailyLimit?: number
  bisonId?: number
}

interface Summary {
  total: number
  healthy: number
  warning: number
  critical: number
  instantly: number
  bison: number
  clientCount: number
}

interface ClientGroup {
  name: string
  platform: 'instantly' | 'bison'
  mailboxes: MailboxHealth[]
  healthy: number
  warning: number
  critical: number
  avgScore: number
  readyToLaunch: boolean
  readyPercent: number
  warmupNotEnabled: number
  warmupNotCompleted: number
}

export default function MailboxHealthPage() {
  const [mailboxes, setMailboxes] = useState<MailboxHealth[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; cacheAge?: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewFilter, setViewFilter] = useState<'all' | 'not-ready' | 'not-enabled' | 'warming' | 'ready'>('all')
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  
  // Modal States
  const [warmupModalOpen, setWarmupModalOpen] = useState(false)
  const [warmupModalClient, setWarmupModalClient] = useState('')
  const [warmupModalPlatform, setWarmupModalPlatform] = useState<'instantly' | 'bison'>('instantly')
  const [warmupLoading, setWarmupLoading] = useState(false)
  const [warmupSummary, setWarmupSummary] = useState<any>(null)
  const [warmupAccounts, setWarmupAccounts] = useState<any[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; mailbox: MailboxHealth | null; deleting: boolean }>({ open: false, mailbox: null, deleting: false })

  useEffect(() => { loadMailboxHealth() }, [])

  const loadMailboxHealth = async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/mailbox-health?refresh=true' : '/api/mailbox-health'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setMailboxes(data.mailboxes)
        setSummary(data.summary)
        setCacheInfo({ cached: data.cached || false, cacheAge: data.cacheAge })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadWarmupData = async (clientName: string, platform: 'instantly' | 'bison', emails?: string[]) => {
    setWarmupModalClient(clientName)
    setWarmupModalPlatform(platform)
    setWarmupModalOpen(true)
    setWarmupLoading(true)
    setWarmupSummary(null)
    setWarmupAccounts([])

    try {
      const endpoint = platform === 'instantly' ? '/api/warmup-analytics' : '/api/bison-warmup'
      const body = platform === 'instantly' ? { clientName, emails } : { clientName }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      if (data.success) {
        setWarmupSummary(data.summary)
        setWarmupAccounts(platform === 'instantly' ? Object.values(data.analytics) : data.accounts)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setWarmupLoading(false)
    }
  }

  // Computed
  const warmupNotEnabled = mailboxes.filter(m => m.issues.some(i => i.includes('WARMUP NOT ENABLED')))
  const warmupNotCompleted = mailboxes.filter(m => m.issues.some(i => i.includes('WARMUP NOT COMPLETED')))

  const clientGroups = useMemo(() => {
    const filtered = mailboxes.filter(m =>
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groups: Record<string, ClientGroup> = {}
    filtered.forEach(m => {
      if (!groups[m.clientName]) {
        groups[m.clientName] = {
          name: m.clientName, platform: m.platform, mailboxes: [], healthy: 0, warning: 0, critical: 0,
          avgScore: 0, readyToLaunch: false, readyPercent: 0, warmupNotEnabled: 0, warmupNotCompleted: 0
        }
      }
      groups[m.clientName].mailboxes.push(m)
      if (m.status === 'healthy') groups[m.clientName].healthy++
      else if (m.status === 'warning') groups[m.clientName].warning++
      else groups[m.clientName].critical++
      if (m.issues.some(i => i.includes('WARMUP NOT ENABLED'))) groups[m.clientName].warmupNotEnabled++
      if (m.issues.some(i => i.includes('WARMUP NOT COMPLETED'))) groups[m.clientName].warmupNotCompleted++
    })

    Object.values(groups).forEach(g => {
      const scores = g.mailboxes.filter(m => m.warmupScore).map(m => m.warmupScore!)
      g.avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      g.readyPercent = Math.round((g.healthy / g.mailboxes.length) * 100)
      g.readyToLaunch = g.readyPercent >= 80 && g.warmupNotEnabled === 0 && g.warmupNotCompleted === 0
    })

    let result = Object.values(groups)
    if (viewFilter === 'ready') result = result.filter(g => g.readyToLaunch)
    if (viewFilter === 'not-ready') result = result.filter(g => !g.readyToLaunch)
    if (viewFilter === 'not-enabled') result = result.filter(g => g.warmupNotEnabled > 0)
    if (viewFilter === 'warming') result = result.filter(g => g.warmupNotCompleted > 0)
    return result.sort((a, b) => a.readyToLaunch === b.readyToLaunch ? a.readyPercent - b.readyPercent : a.readyToLaunch ? 1 : -1)
  }, [mailboxes, searchQuery, viewFilter])

  const { readyCount, notEnabledClientCount, warmingClientCount } = useMemo(() => {
    const groups: Record<string, ClientGroup> = {}
    mailboxes.forEach(m => {
      if (!groups[m.clientName]) groups[m.clientName] = { name: m.clientName, platform: m.platform, mailboxes: [], healthy: 0, warning: 0, critical: 0, avgScore: 0, readyToLaunch: false, readyPercent: 0, warmupNotEnabled: 0, warmupNotCompleted: 0 }
      groups[m.clientName].mailboxes.push(m)
      if (m.status === 'healthy') groups[m.clientName].healthy++
      if (m.issues.some(i => i.includes('WARMUP NOT ENABLED'))) groups[m.clientName].warmupNotEnabled++
      if (m.issues.some(i => i.includes('WARMUP NOT COMPLETED'))) groups[m.clientName].warmupNotCompleted++
    })
    Object.values(groups).forEach(g => {
      g.readyPercent = Math.round((g.healthy / g.mailboxes.length) * 100)
      g.readyToLaunch = g.readyPercent >= 80 && g.warmupNotEnabled === 0 && g.warmupNotCompleted === 0
    })
    const allGroups = Object.values(groups)
    return {
      readyCount: allGroups.filter(g => g.readyToLaunch).length,
      notEnabledClientCount: allGroups.filter(g => g.warmupNotEnabled > 0).length,
      warmingClientCount: allGroups.filter(g => g.warmupNotCompleted > 0).length
    }
  }, [mailboxes])

  const notReadyCount = (summary?.clientCount || 0) - readyCount

  const exportCSV = () => {
    const rows = [['Email', 'Client', 'Platform', 'Status', 'Score', 'Issues'], ...mailboxes.map(m => [m.email, m.clientName, m.platform, m.status, m.warmupScore || '', m.issues.join('; ')])]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mailbox-health-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleDelete = async () => {
    if (!deleteConfirm.mailbox) return
    setDeleteConfirm(p => ({ ...p, deleting: true }))
    try {
      const res = await fetch('/api/mailbox-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: deleteConfirm.mailbox.platform, clientName: deleteConfirm.mailbox.clientName, email: deleteConfirm.mailbox.email, bisonId: deleteConfirm.mailbox.bisonId })
      })
      if ((await res.json()).success) {
        setMailboxes(p => p.filter(m => m.email !== deleteConfirm.mailbox?.email))
        setDeleteConfirm({ open: false, mailbox: null, deleting: false })
      }
    } catch { }
    setDeleteConfirm(p => ({ ...p, deleting: false }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Mailbox Health" description="Campaign readiness" />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header title="Mailbox Health" description="Campaign readiness" />

        <div className="container max-w-7xl py-6 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Mailboxes</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.instantly} Instantly · {summary?.bison} Bison
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.clientCount}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{readyCount} ready</Badge>
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-100">{notReadyCount} not ready</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Not Enabled</CardTitle>
                <XCircle className={`h-4 w-4 ${warmupNotEnabled.length > 0 ? 'text-rose-400' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${warmupNotEnabled.length > 0 ? 'text-rose-500' : ''}`}>
                  {warmupNotEnabled.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {warmupNotEnabled.length > 0 ? 'Infra never enabled warmup' : 'All warmups enabled'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Still Warming</CardTitle>
                <Flame className={`h-4 w-4 ${warmupNotCompleted.length > 0 ? 'text-orange-400' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${warmupNotCompleted.length > 0 ? 'text-orange-500' : ''}`}>
                  {warmupNotCompleted.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {warmupNotCompleted.length > 0 ? 'Need 14+ days & 500+ emails' : 'All warmups complete'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4">
            <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v as any)}>
              <TabsList className="bg-muted/50 h-auto flex-wrap gap-1 p-1">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  All ({summary?.clientCount})
                </TabsTrigger>
                <TabsTrigger value="not-ready" className="text-xs sm:text-sm data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">
                  ❌ Not Ready ({notReadyCount})
                </TabsTrigger>
                <TabsTrigger value="not-enabled" className="text-xs sm:text-sm data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">
                  ⚠️ Not Enabled ({notEnabledClientCount})
                </TabsTrigger>
                <TabsTrigger value="warming" className="text-xs sm:text-sm data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
                  🔥 Warming ({warmingClientCount})
                </TabsTrigger>
                <TabsTrigger value="ready" className="text-xs sm:text-sm data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
                  ✅ Ready ({readyCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setRefreshing(true); loadMailboxHealth(true) }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {cacheInfo?.cached ? `${cacheInfo.cacheAge}s` : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Client List */}
          <div className="space-y-3">
            {clientGroups.length === 0 ? (
              <Card className="p-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No clients match your filters</p>
              </Card>
            ) : (
              clientGroups.map(group => (
                <Collapsible
                  key={group.name}
                  open={expandedClients.has(group.name)}
                  onOpenChange={() => {
                    const next = new Set(expandedClients)
                    next.has(group.name) ? next.delete(group.name) : next.add(group.name)
                    setExpandedClients(next)
                  }}
                >
                  <Card className={group.readyToLaunch ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-rose-400'}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedClients.has(group.name) ? '' : '-rotate-90'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{group.name}</CardTitle>
                                <Badge variant="outline">{group.platform}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{group.mailboxes.length} mailboxes</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Issue pills */}
                            {(group.warmupNotEnabled > 0 || group.warmupNotCompleted > 0) && (
                              <div className="flex gap-2">
                                {group.warmupNotEnabled > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="secondary" className="bg-rose-50 text-rose-600 hover:bg-rose-50">{group.warmupNotEnabled} not enabled</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Warmup was never turned on</TooltipContent>
                                  </Tooltip>
                                )}
                                {group.warmupNotCompleted > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="secondary" className="bg-orange-50 text-orange-600 hover:bg-orange-50">{group.warmupNotCompleted} warming</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Still warming up, not ready yet</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )}

                            {/* Progress */}
                            <div className="w-24">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Ready</span>
                                <span className="font-medium">{group.readyPercent}%</span>
                              </div>
                              <Progress value={group.readyPercent} className={`h-2 ${group.readyToLaunch ? '[&>div]:bg-emerald-400' : '[&>div]:bg-rose-400'}`} />
                            </div>

                            {/* Status badge */}
                            <Badge variant="secondary" className={`${group.readyToLaunch ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} min-w-[90px] justify-center hover:bg-opacity-100`}>
                              {group.readyToLaunch ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Ready</>
                              ) : (
                                <><XCircle className="h-3 w-3 mr-1" /> Not Ready</>
                              )}
                            </Badge>

                            {/* Details button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                loadWarmupData(group.name, group.platform, group.mailboxes.map(m => m.email))
                              }}
                            >
                              <BarChart3 className="h-4 w-4 mr-1" /> Details
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead className="text-right">Score</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.mailboxes.map((m, i) => (
                              <TableRow key={i} className={m.status === 'critical' ? 'bg-rose-50/50' : m.status === 'warning' ? 'bg-orange-50/50' : ''}>
                                <TableCell className="font-medium">{m.email}</TableCell>
                                <TableCell>
                                  {m.status === 'healthy' && <Badge variant="secondary" className="bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Healthy</Badge>}
                                  {m.status === 'warning' && <Badge variant="secondary" className="bg-orange-50 text-orange-600"><AlertTriangle className="h-3 w-3 mr-1" /> Warning</Badge>}
                                  {m.status === 'critical' && <Badge variant="secondary" className="bg-rose-50 text-rose-600"><XCircle className="h-3 w-3 mr-1" /> Critical</Badge>}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                                  {m.issues[0] || '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {m.warmupScore !== undefined ? (
                                    <span className={`font-medium ${m.warmupScore >= 70 ? 'text-emerald-600' : m.warmupScore >= 40 ? 'text-orange-500' : 'text-rose-500'}`}>
                                      {m.warmupScore}%
                                    </span>
                                  ) : '—'}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                    onClick={() => setDeleteConfirm({ open: true, mailbox: m, deleting: false })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </div>

        {/* Modals */}
        <WarmupModal
          open={warmupModalOpen}
          onOpenChange={setWarmupModalOpen}
          clientName={warmupModalClient}
          platform={warmupModalPlatform}
          loading={warmupLoading}
          summary={warmupSummary}
          accounts={warmupAccounts}
        />

        <Dialog open={deleteConfirm.open} onOpenChange={(o) => !deleteConfirm.deleting && setDeleteConfirm({ open: o, mailbox: null, deleting: false })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Mailbox</DialogTitle>
            </DialogHeader>
            {deleteConfirm.mailbox && (
              <div className="space-y-4">
                <p className="text-muted-foreground">Are you sure you want to delete this mailbox?</p>
                <Card className="p-4">
                  <p className="font-medium">{deleteConfirm.mailbox.email}</p>
                  <p className="text-sm text-muted-foreground">{deleteConfirm.mailbox.clientName}</p>
                </Card>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, mailbox: null, deleting: false })}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirm.deleting}>
                    {deleteConfirm.deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
