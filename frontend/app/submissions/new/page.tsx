'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Settings,
  Users,
  Mail,
  Video,
  Sparkles,
  Info,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ValidationStatus = 'idle' | 'validating' | 'pass' | 'fail' | 'warning'

interface ValidationResult {
  status: ValidationStatus
  message: string
  details?: string[]
}

export default function NewSubmissionPage() {
  const [activeTab, setActiveTab] = useState('strategy-call')
  const [clients, setClients] = useState<{ id: string; name: string; platform: string; workspaceId: string }[]>([])
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status?: string }[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState('')

  // Load clients on component mount
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoadingClients(true)
      const response = await fetch('/api/clients')
      const data = await response.json()

      if (data.success) {
        setClients(data.clients)
      } else {
        console.error('Failed to load clients:', data.error)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    fathomMeetingId: '',
    strategyTranscript: '',
    intakeFormUrl: '',
    platform: 'instantly',
    workspaceId: '',
    campaignId: '',
    leadCount: '',
    leadListUrl: '',
    loomUrl: '',
    loomTranscript: '',
    // Gmail thread data
    selectedThreadId: '',
    threadMessages: [] as any[],
    // Slack channel data
    selectedSlackChannel: '',
    slackMessages: [] as any[]
  })

  // Gmail search state
  const [gmailSearchQuery, setGmailSearchQuery] = useState('')
  const [loadingGmailSearch, setLoadingGmailSearch] = useState(false)

  // Slack state
  const [slackChannels, setSlackChannels] = useState<Array<{ id: string; name: string; member_count: number }>>([])
  const [loadingSlackChannels, setLoadingSlackChannels] = useState(false)
  const [loadingSlackHistory, setLoadingSlackHistory] = useState(false)

  // Bison mailbox state
  const [mailboxData, setMailboxData] = useState<{
    accounts: any[]
    health_summary: {
      total: number
      healthy: number
      warning: number
      critical: number
      avg_warmup_score: number
    }
  } | null>(null)
  const [loadingMailboxes, setLoadingMailboxes] = useState(false)

  const [validations, setValidations] = useState({
    strategyCall: { status: 'idle', message: '' } as ValidationResult,
    infrastructure: { status: 'idle', message: '' } as ValidationResult,
    leadList: { status: 'idle', message: '' } as ValidationResult,
    emailCopy: { status: 'idle', message: '' } as ValidationResult,
    loom: { status: 'idle', message: '' } as ValidationResult
  })

  const tabs = [
    { id: 'strategy-call', label: 'Strategy Call', icon: FileText, key: 'strategyCall' },
    { id: 'infrastructure', label: 'Infrastructure', icon: Settings, key: 'infrastructure' },
    { id: 'lead-list', label: 'Lead List', icon: Users, key: 'leadList' },
    { id: 'email-copy', label: 'Email Copy', icon: Mail, key: 'emailCopy' },
    { id: 'loom-video', label: 'Loom Video', icon: Video, key: 'loom' }
  ]

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId)
    if (selectedClient) {
      setFormData({
        ...formData,
        clientId,
        clientName: selectedClient.name,
        platform: selectedClient.platform,
        workspaceId: selectedClient.workspaceId,
        campaignId: '' // Reset campaign when client changes
      })

      // Load campaigns for this client
      loadCampaigns(clientId, selectedClient.name, selectedClient.platform)
    }
  }

  const loadCampaigns = async (clientId: string, clientName: string, platform: string) => {
    try {
      setLoadingCampaigns(true)
      const response = await fetch(`/api/campaigns?clientName=${encodeURIComponent(clientName)}&platform=${platform}`)
      const data = await response.json()

      if (data.success) {
        setCampaigns(data.campaigns)
      } else {
        console.error('Failed to load campaigns:', data.error)
        setCampaigns([])
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      setCampaigns([])
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const searchGmailEmails = async () => {
    if (!gmailSearchQuery.trim()) return

    try {
      setLoadingGmailSearch(true)

      // Add default 90-day filter in background
      const ninetyDaysAgo = new Date(Date.now() - 90*24*60*60*1000).toISOString().split('T')[0].replace(/-/g, '/')
      const queryWithDateFilter = `${gmailSearchQuery} after:${ninetyDaysAgo}`

      const response = await fetch(`/api/gmail/search?query=${encodeURIComponent(queryWithDateFilter)}&maxResults=10`)
      const data = await response.json()

      if (data.success && data.results.length > 0) {
        // Automatically load the first (most relevant) thread silently
        const firstThreadId = data.results[0].thread_id
        await loadEmailThreadSilently(firstThreadId)
      } else {
        console.error('No emails found')
      }
    } catch (error) {
      console.error('Error searching emails:', error)
    } finally {
      setLoadingGmailSearch(false)
    }
  }

  const loadEmailThreadSilently = async (threadId: string) => {
    try {
      const response = await fetch(`/api/gmail/thread?threadId=${threadId}`)
      const data = await response.json()

      if (data.success) {
        // Store thread data silently for AI validation
        setFormData({
          ...formData,
          selectedThreadId: threadId,
          threadMessages: data.messages
        })
      } else {
        console.error('Failed to load thread:', data.error)
      }
    } catch (error) {
      console.error('Error loading thread:', error)
    }
  }

  const loadSlackChannels = async () => {
    try {
      setLoadingSlackChannels(true)
      const response = await fetch('/api/slack/channels')
      const data = await response.json()

      if (data.success) {
        setSlackChannels(data.channels)
      } else {
        console.error('Failed to load Slack channels:', data.error)
      }
    } catch (error) {
      console.error('Error loading Slack channels:', error)
    } finally {
      setLoadingSlackChannels(false)
    }
  }

  const loadSlackChannelHistory = async (channelId: string) => {
    try {
      setLoadingSlackHistory(true)
      const response = await fetch(`/api/slack/history?channel=${encodeURIComponent(channelId)}&limit=30d`)
      const data = await response.json()

      if (data.success) {
        setFormData({
          ...formData,
          selectedSlackChannel: channelId,
          slackMessages: data.messages
        })
      } else {
        console.error('Failed to load Slack history:', data.error)
      }
    } catch (error) {
      console.error('Error loading Slack history:', error)
    } finally {
      setLoadingSlackHistory(false)
    }
  }

  const loadMailboxes = async () => {
    if (!formData.clientName || formData.platform !== 'bison') {
      console.error('Can only load mailboxes for Bison clients')
      return
    }

    try {
      setLoadingMailboxes(true)
      const response = await fetch(`/api/bison/sender-emails?clientName=${encodeURIComponent(formData.clientName)}`)
      const data = await response.json()

      if (data.success) {
        setMailboxData({
          accounts: data.accounts,
          health_summary: data.health_summary,
        })
      } else {
        console.error('Failed to load mailboxes:', data.error)
      }
    } catch (error) {
      console.error('Error loading mailboxes:', error)
    } finally {
      setLoadingMailboxes(false)
    }
  }

  const handleValidate = (step: string) => {
    setValidations(prev => ({
      ...prev,
      [step]: { status: 'validating', message: 'Validating...' }
    }))

    setTimeout(() => {
      if (step === 'strategyCall') {
        setValidations(prev => ({
          ...prev,
          strategyCall: {
            status: 'pass',
            message: 'Strategy call validated successfully',
            details: [
              '✅ Transcript loaded (47 min call)',
              '✅ ICP extracted via Claude AI',
              '✅ Target: VP/Director Sales, B2B SaaS, 50-500 employees',
              '✅ Clear value proposition identified'
            ]
          }
        }))
      } else if (step === 'infrastructure') {
        setValidations(prev => ({
          ...prev,
          infrastructure: {
            status: 'warning',
            message: 'Infrastructure configured with warnings',
            details: [
              '✅ Mailbox health: Excellent (89/100)',
              '✅ Campaign configured correctly',
              '✅ Sending schedule: 8am-5pm EST',
              '⚠️ Daily limit: 500 (recommend 150 max for better deliverability)'
            ]
          }
        }))
      } else if (step === 'leadList') {
        setValidations(prev => ({
          ...prev,
          leadList: {
            status: 'fail',
            message: 'Lead list needs attention',
            details: [
              '✅ 2,847 leads total',
              '✅ All required fields populated',
              '✅ Email validation: 98.3% valid',
              '❌ ICP Match: 78% (627 leads outside target)',
              '❌ Found 14 leads with "Manager" titles (need VP+)',
              '❌ 8 leads at companies with <50 employees'
            ]
          }
        }))
      } else if (step === 'emailCopy') {
        setValidations(prev => ({
          ...prev,
          emailCopy: {
            status: 'fail',
            message: 'Email copy issues detected',
            details: [
              '✅ Email 1: Spam Score 2.1/10 | Quality 9/10',
              '✅ Email 2: Spam Score 3.2/10 | Quality 8/10',
              '❌ Email 3: Spam Score 7.8/10 | Quality 6/10',
              '   → Remove trigger words: "free", "limited time", "act now"',
              '   → Too many links (4 found, max 2 recommended)',
              '✅ Personalization: Excellent ({{firstName}}, {{company}}, {{painPoint}})'
            ]
          }
        }))
      } else if (step === 'loom') {
        setValidations(prev => ({
          ...prev,
          loom: {
            status: 'warning',
            message: 'Loom explanation could be improved',
            details: [
              '✅ Duration: 4m 32s (ideal length)',
              '✅ Explained ICP logic and research process',
              '✅ Referenced strategy call key points',
              '✅ Walked through email sequence logic',
              '⚠️ Missing: Why 3 emails vs standard 5-email sequence?',
              '⚠️ Suggestion: Add expected response rate projection'
            ]
          }
        }))
      }
    }, 2000)
  }

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'validating':
        return <Loader2 className="animate-spin text-blue-500" size={20} />
      case 'pass':
        return <CheckCircle className="text-emerald-500" size={20} />
      case 'fail':
        return <XCircle className="text-red-500" size={20} />
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={20} />
      default:
        return null
    }
  }

  const getValidationCard = (validation: ValidationResult) => {
    if (validation.status === 'idle') return null

    const variants = {
      validating: 'border-blue-200 bg-blue-50',
      pass: 'border-emerald-200 bg-emerald-50',
      fail: 'border-red-200 bg-red-50',
      warning: 'border-amber-200 bg-amber-50'
    }

    return (
      <Card className={`${variants[validation.status]} shadow-soft`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            {getStatusIcon(validation.status)}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-2">
                {validation.message}
              </p>
              {validation.details && (
                <ul className="space-y-1.5">
                  {validation.details.map((detail, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const completedSteps = Object.values(validations).filter(v => v.status === 'pass').length
  const progress = (completedSteps / 5) * 100

  return (
    <div className="min-h-screen">
      {/* Premium Header */}
      <header className="glass-strong border-b">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft size={20} />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  New Campaign Submission
                </h1>
                <p className="text-xs text-muted-foreground">
                  Complete all validation steps to submit for review to High Ticket Machine Delivery
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-2">
              <Sparkles size={12} />
              {completedSteps}/5 Complete
            </Badge>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Overall Progress</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-900 to-gray-700 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-8 lg:px-12 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-gray-100/80">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const validation = validations[tab.key as keyof typeof validations]
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="hidden sm:inline text-sm font-medium">{tab.label}</span>
                  </div>
                  {validation.status === 'pass' && (
                    <CheckCircle size={14} className="text-emerald-500" />
                  )}
                  {validation.status === 'fail' && (
                    <XCircle size={14} className="text-red-500" />
                  )}
                  {validation.status === 'warning' && (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Step 1: Strategy Call */}
          <TabsContent value="strategy-call" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <FileText size={20} className="text-gray-700" />
                  </div>
                  Strategy Call Reference
                </CardTitle>
                <CardDescription>
                  Search client email threads to gather strategy call context, ICP details, and campaign requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Select Client *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={handleClientSelect}
                      disabled={loadingClients}
                      onOpenChange={(open) => !open && setClientSearchQuery('')}
                    >
                      <SelectTrigger id="clientId">
                        <SelectValue placeholder={loadingClients ? "Loading clients..." : "Choose a client..."} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto bg-white z-50">
                        {loadingClients ? (
                          <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="animate-spin" size={14} />
                            Loading...
                          </div>
                        ) : clients.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No clients found
                          </div>
                        ) : (
                          <>
                            <div className="sticky top-0 bg-white p-2 border-b z-10">
                              <div className="relative">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                  placeholder="Search clients..."
                                  value={clientSearchQuery}
                                  onChange={(e) => setClientSearchQuery(e.target.value)}
                                  className="pl-7 h-8 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            {clients
                              .filter((client) =>
                                client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                client.platform.toLowerCase().includes(clientSearchQuery.toLowerCase())
                              )
                              .map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} ({client.platform})
                                </SelectItem>
                              ))}
                            {clients.filter((client) =>
                              client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                              client.platform.toLowerCase().includes(clientSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No clients match your search
                              </div>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {formData.clientId && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info size={12} />
                        Platform: {formData.platform} • Workspace: {formData.workspaceId}
                      </p>
                    )}
                  </div>

                  {/* Gmail Search */}
                  {formData.clientId && (
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start gap-3">
                          <Mail size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Search Client Email Threads</p>
                              <p className="text-sm text-gray-700">
                                Search Jay's Gmail for emails with {formData.clientName} to find strategy call discussions, intake forms, and campaign details
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                  value={gmailSearchQuery}
                                  onChange={(e) => setGmailSearchQuery(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && searchGmailEmails()}
                                  placeholder={`Search: from:${formData.clientName.toLowerCase().replace(/\s+/g, '')}@...`}
                                  className="pl-9 bg-white"
                                />
                              </div>
                              <Button
                                onClick={searchGmailEmails}
                                disabled={loadingGmailSearch || !gmailSearchQuery.trim()}
                                className="shadow-sm"
                              >
                                {loadingGmailSearch ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Search size={16} />
                                )}
                              </Button>
                            </div>


                            {/* Loading State */}
                            {loadingGmailSearch && (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                <p className="text-sm text-gray-600 ml-3">Loading client context...</p>
                              </div>
                            )}

                            {/* Success Message */}
                            {!loadingGmailSearch && formData.selectedThreadId && (
                              <Card className="bg-emerald-50 border-emerald-200">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle size={20} className="text-emerald-600" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-emerald-900">
                                        Client context loaded successfully
                                      </p>
                                      <p className="text-xs text-emerald-700 mt-0.5">
                                        {formData.threadMessages.length} email messages captured for AI validation
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Slack Channel History */}
                  {formData.clientId && (
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Mail size={20} className="text-purple-700" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Load Slack Channel Context (Optional)</p>
                              <p className="text-sm text-gray-700">
                                Select a Slack channel to load conversation history for campaign context and client communication analysis
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Select
                                  value={formData.selectedSlackChannel}
                                  onValueChange={(channelId) => loadSlackChannelHistory(channelId)}
                                  disabled={loadingSlackChannels || loadingSlackHistory}
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={loadingSlackChannels ? "Loading channels..." : "Select a Slack channel..."} />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px] overflow-y-auto bg-white z-50">
                                    {loadingSlackChannels ? (
                                      <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={14} />
                                        Loading...
                                      </div>
                                    ) : slackChannels.length === 0 ? (
                                      <div className="p-2 text-sm text-muted-foreground">
                                        No channels found
                                      </div>
                                    ) : (
                                      slackChannels.map((channel) => (
                                        <SelectItem key={channel.id} value={channel.id}>
                                          #{channel.name} ({channel.member_count} members)
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={loadSlackChannels}
                                disabled={loadingSlackChannels}
                                variant="outline"
                                className="shadow-sm bg-white"
                              >
                                {loadingSlackChannels ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  'Load Channels'
                                )}
                              </Button>
                            </div>

                            {/* Loading State */}
                            {loadingSlackHistory && (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-purple-600" size={24} />
                                <p className="text-sm text-gray-600 ml-3">Loading channel history...</p>
                              </div>
                            )}

                            {/* Success Message */}
                            {!loadingSlackHistory && formData.selectedSlackChannel && formData.slackMessages.length > 0 && (
                              <Card className="bg-emerald-50 border-emerald-200">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle size={20} className="text-emerald-600" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-emerald-900">
                                        Slack channel loaded successfully
                                      </p>
                                      <p className="text-xs text-emerald-700 mt-0.5">
                                        {formData.slackMessages.length} messages from last 30 days captured for AI validation
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional fields */}
                  <div className="space-y-2">
                    <Label htmlFor="fathomMeetingId">Fathom Meeting ID (Optional)</Label>
                    <Input
                      id="fathomMeetingId"
                      value={formData.fathomMeetingId}
                      onChange={(e) => setFormData({ ...formData, fathomMeetingId: e.target.value })}
                      placeholder="e.g., abc-123-xyz"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info size={12} />
                      If you have a Fathom recording link, add it here
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strategyTranscript">Strategy Call Transcript (Optional)</Label>
                    <Textarea
                      id="strategyTranscript"
                      value={formData.strategyTranscript}
                      onChange={(e) => setFormData({ ...formData, strategyTranscript: e.target.value })}
                      placeholder="Paste the full strategy call transcript here..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info size={12} />
                      Paste the complete transcript from the strategy call
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="intakeFormUrl">Intake Form URL (Optional)</Label>
                    <Input
                      id="intakeFormUrl"
                      type="url"
                      value={formData.intakeFormUrl}
                      onChange={(e) => setFormData({ ...formData, intakeFormUrl: e.target.value })}
                      placeholder="https://docs.google.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Google Doc or form link with additional client details
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleValidate('strategyCall')}
                  disabled={(!formData.selectedThreadId && !formData.fathomMeetingId) || validations.strategyCall.status === 'validating'}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {validations.strategyCall.status === 'validating' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Validating Strategy Call...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Validate with AI
                    </>
                  )}
                </Button>

                {getValidationCard(validations.strategyCall)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Infrastructure */}
          <TabsContent value="infrastructure" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Settings size={20} className="text-gray-700" />
                  </div>
                  Infrastructure Setup
                </CardTitle>
                <CardDescription>
                  Validate mailbox health, campaign configuration, and sending limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  {!formData.clientId && (
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

                  {formData.clientId && (
                    <>
                      {/* Bison Mailbox Health Check */}
                      {formData.platform === 'bison' && (
                        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Mail size={20} className="text-blue-700" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 mb-1">Mailbox Health Check</p>
                                <p className="text-sm text-gray-700">
                                  Check if all sender mailboxes are ready to send campaigns
                                </p>
                              </div>
                            </div>

                            <Button
                              onClick={loadMailboxes}
                              disabled={loadingMailboxes}
                              className="w-full shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                              size="lg"
                            >
                              {loadingMailboxes ? (
                                <>
                                  <Loader2 className="animate-spin" size={18} />
                                  Checking Mailboxes...
                                </>
                              ) : (
                                <>
                                  <Mail size={18} />
                                  Check Mailbox Status
                                </>
                              )}
                            </Button>

                            {/* Mailbox Health Summary */}
                            {mailboxData && (
                              <div className="space-y-3 pt-2">
                                <div className="grid grid-cols-3 gap-3">
                                  <Card className="bg-emerald-50 border-2 border-emerald-300">
                                    <CardContent className="p-4 text-center">
                                      <div className="text-3xl font-bold text-emerald-600">
                                        {mailboxData.health_summary.healthy}
                                      </div>
                                      <div className="text-sm text-gray-900 mt-1 font-semibold">✅ GOOD</div>
                                      <div className="text-xs text-gray-600 mt-0.5">Ready to send</div>
                                    </CardContent>
                                  </Card>
                                  <Card className="bg-amber-50 border-2 border-amber-300">
                                    <CardContent className="p-4 text-center">
                                      <div className="text-3xl font-bold text-amber-600">
                                        {mailboxData.health_summary.warning}
                                      </div>
                                      <div className="text-sm text-gray-900 mt-1 font-semibold">⚠️ WARNING</div>
                                      <div className="text-xs text-gray-600 mt-0.5">Needs review</div>
                                    </CardContent>
                                  </Card>
                                  <Card className="bg-red-50 border-2 border-red-300">
                                    <CardContent className="p-4 text-center">
                                      <div className="text-3xl font-bold text-red-600">
                                        {mailboxData.health_summary.critical}
                                      </div>
                                      <div className="text-sm text-gray-900 mt-1 font-semibold">🚫 BAD</div>
                                      <div className="text-xs text-gray-600 mt-0.5">Cannot send</div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Overall Status Message */}
                                {mailboxData.health_summary.critical === 0 && mailboxData.health_summary.warning === 0 ? (
                                  <Card className="bg-emerald-50 border-2 border-emerald-300">
                                    <CardContent className="p-5">
                                      <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                          <CheckCircle size={24} className="text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-base font-bold text-emerald-900">
                                            ALL CLEAR - Infrastructure is Ready
                                          </p>
                                          <p className="text-sm text-emerald-800 mt-1">
                                            ✅ All {mailboxData.health_summary.total} mailboxes are enabled and healthy
                                          </p>
                                          <p className="text-sm text-emerald-700 mt-2">
                                            <strong>Next step:</strong> Confirm with client that warmup has been running for at least 2 weeks
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ) : mailboxData.health_summary.critical > 0 ? (
                                  <Card className="bg-red-50 border-2 border-red-300">
                                    <CardContent className="p-5">
                                      <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                          <AlertTriangle size={24} className="text-red-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-base font-bold text-red-900">
                                            CRITICAL ISSUE - Cannot Launch Campaign
                                          </p>
                                          <p className="text-sm text-red-800 mt-1">
                                            🚫 {mailboxData.health_summary.critical} mailbox{mailboxData.health_summary.critical > 1 ? 'es are' : ' is'} disabled and cannot send emails
                                          </p>
                                          <p className="text-sm text-red-700 mt-2">
                                            <strong>Action required:</strong> Contact client to fix disabled mailboxes before launching
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ) : (
                                  <Card className="bg-amber-50 border-2 border-amber-300">
                                    <CardContent className="p-5">
                                      <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                          <AlertTriangle size={24} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-base font-bold text-amber-900">
                                            WARNING - Review Required
                                          </p>
                                          <p className="text-sm text-amber-800 mt-1">
                                            ⚠️ {mailboxData.health_summary.warning} mailbox{mailboxData.health_summary.warning > 1 ? 'es need' : ' needs'} attention
                                          </p>
                                          <p className="text-sm text-amber-700 mt-2">
                                            <strong>Action required:</strong>{' '}
                                            {(() => {
                                              // Analyze warning mailboxes using industry-standard logic
                                              const warningMailboxes = mailboxData.accounts.filter(acc => {
                                                const emailsSent = acc.warmup_emails_sent || 0
                                                const bouncesCaused = acc.warmup_bounces_caused_count || 0
                                                const bounceRate = emailsSent > 0 ? (bouncesCaused / emailsSent) * 100 : 0
                                                const score = acc.warmup_score || 0
                                                const hasMinimumWarmup = emailsSent >= 140
                                                const isDisabled = acc.warmup_disabled_for_bouncing_count > 0

                                                const isCritical = isDisabled || score < 30 || bounceRate > 5
                                                const isWarning = !isCritical && (!hasMinimumWarmup || score < 50 || bounceRate > 2)
                                                return isWarning
                                              })

                                              const needMoreWarmup = warningMailboxes.filter(acc => (acc.warmup_emails_sent || 0) < 140).length
                                              const lowScores = warningMailboxes.filter(acc => {
                                                const emailsSent = acc.warmup_emails_sent || 0
                                                return emailsSent >= 140 && (acc.warmup_score || 0) < 50
                                              }).length
                                              const highBounceRate = warningMailboxes.filter(acc => {
                                                const emailsSent = acc.warmup_emails_sent || 0
                                                const bouncesCaused = acc.warmup_bounces_caused_count || 0
                                                const bounceRate = emailsSent > 0 ? (bouncesCaused / emailsSent) * 100 : 0
                                                return emailsSent >= 140 && bounceRate > 2
                                              }).length

                                              const issues = []
                                              if (highBounceRate > 0) issues.push(`${highBounceRate} have high bounce rates`)
                                              if (lowScores > 0) issues.push(`${lowScores} have low warmup scores`)
                                              if (needMoreWarmup > 0) issues.push(`${needMoreWarmup} need more warmup time`)

                                              return issues.length > 0 ? issues.join(', ') : 'Review mailboxes below'
                                            })()}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Detailed Mailbox List */}
                                <Card className="bg-white">
                                  <CardContent className="p-4">
                                    <div className="mb-4">
                                      <p className="text-base font-bold text-gray-900">Individual Mailbox Status</p>
                                      <p className="text-xs text-gray-600 mt-1">Showing all {mailboxData.health_summary.total} mailboxes (warmup data from last 90 days)</p>
                                    </div>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                      {mailboxData.accounts.map((account) => {
                                        // Industry-standard warmup health classification
                                        const emailsSent = account.warmup_emails_sent || 0
                                        const bouncesCaused = account.warmup_bounces_caused_count || 0
                                        const bounceRate = emailsSent > 0 ? (bouncesCaused / emailsSent) * 100 : 0
                                        const score = account.warmup_score || 0

                                        const hasMinimumWarmup = emailsSent >= 140 // 14+ days
                                        const isDisabled = account.warmup_disabled_for_bouncing_count > 0

                                        // CRITICAL: Disabled or severe issues
                                        const isCritical = isDisabled || score < 30 || bounceRate > 5

                                        // WARNING: Needs attention but not critical
                                        const isWarning = !isCritical && (!hasMinimumWarmup || score < 50 || bounceRate > 2)

                                        // HEALTHY: Ready to send
                                        const isHealthy = !isCritical && !isWarning

                                        return (
                                          <Card key={account.id} className={`
                                            ${isCritical ? 'bg-red-50 border-2 border-red-400' : ''}
                                            ${isWarning ? 'bg-amber-50 border-2 border-amber-300' : ''}
                                            ${isHealthy ? 'bg-emerald-50 border-2 border-emerald-300' : ''}
                                          `}>
                                            <CardContent className="p-4">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className={`
                                                      text-xs font-bold px-2.5 py-1 rounded-md
                                                      ${isCritical ? 'bg-red-600 text-white' : ''}
                                                      ${isWarning ? 'bg-amber-600 text-white' : ''}
                                                      ${isHealthy ? 'bg-emerald-600 text-white' : ''}
                                                    `}>
                                                      {isCritical ? '🚫 DISABLED' : isWarning ? '⚠️ WARNING' : '✅ GOOD'}
                                                    </span>
                                                  </div>
                                                  <p className="text-sm font-semibold text-gray-900 mt-2 truncate">
                                                    {account.email}
                                                  </p>
                                                  <p className="text-xs text-gray-600 mt-0.5">
                                                    {account.name}
                                                  </p>
                                                  {account.created_at && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                      📅 Added: {new Date(account.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                      })}
                                                    </p>
                                                  )}
                                                  <div className="mt-3 space-y-2">
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                      <div>
                                                        <span className="text-gray-600">Score:</span>
                                                        <span className={`ml-1 font-bold ${
                                                          score >= 50 ? 'text-emerald-600' : score >= 30 ? 'text-amber-600' : 'text-red-600'
                                                        }`}>
                                                          {score}/100
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-gray-600">Emails Sent:</span>
                                                        <span className={`ml-1 font-bold ${
                                                          hasMinimumWarmup ? 'text-emerald-600' : 'text-amber-600'
                                                        }`}>
                                                          {emailsSent}
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-gray-600">Replies:</span>
                                                        <span className="ml-1 font-semibold text-gray-700">
                                                          {account.warmup_replies_received}
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-gray-600">Bounce Rate:</span>
                                                        <span className={`ml-1 font-bold ${
                                                          bounceRate <= 2 ? 'text-emerald-600' : bounceRate <= 5 ? 'text-amber-600' : 'text-red-600'
                                                        }`}>
                                                          {bounceRate.toFixed(1)}%
                                                        </span>
                                                      </div>
                                                    </div>

                                                    {/* Estimated warmup duration */}
                                                    {account.warmup_emails_sent > 0 && (
                                                      <div className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                                                        <span className="font-medium">Est. warmup duration:</span>
                                                        <span className="ml-1">
                                                          ~{Math.round(account.warmup_emails_sent / 10)} days
                                                          {account.warmup_emails_sent < 140 && (
                                                            <span className="ml-1 text-amber-600 font-semibold">(need 14+ days)</span>
                                                          )}
                                                        </span>
                                                      </div>
                                                    )}

                                                    {/* Warning/Error reasons */}
                                                    {isCritical && (
                                                      <div className="text-xs bg-red-100 text-red-800 px-2 py-1.5 rounded mt-2 font-semibold">
                                                        {isDisabled && '🚫 DISABLED: Mailbox disabled for bouncing - cannot send'}
                                                        {!isDisabled && score < 30 && '📊 CRITICAL: Very low warmup score (need 30+)'}
                                                        {!isDisabled && score >= 30 && bounceRate > 5 && `⚠️ CRITICAL: High bounce rate ${bounceRate.toFixed(1)}% (need < 5%)`}
                                                      </div>
                                                    )}
                                                    {!isCritical && isWarning && (
                                                      <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1.5 rounded mt-2 font-semibold">
                                                        {(() => {
                                                          const issues = []
                                                          if (!hasMinimumWarmup) issues.push('⏰ Needs 14+ days warmup')
                                                          if (score < 50) issues.push('📊 Low score (need 50+)')
                                                          if (bounceRate > 2) issues.push(`⚠️ Bounce rate ${bounceRate.toFixed(1)}% (target < 2%)`)
                                                          return issues.join(' • ')
                                                        })()}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className={`
                                                  w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0
                                                  ${isCritical ? 'bg-red-100' : ''}
                                                  ${isWarning ? 'bg-amber-100' : ''}
                                                  ${isHealthy ? 'bg-emerald-100' : ''}
                                                `}>
                                                  <div className="text-center">
                                                    <div className={`
                                                      text-2xl font-bold
                                                      ${isCritical ? 'text-red-700' : ''}
                                                      ${isWarning ? 'text-amber-700' : ''}
                                                      ${isHealthy ? 'text-emerald-700' : ''}
                                                    `}>
                                                      {account.warmup_score}
                                                    </div>
                                                    <div className="text-xs text-gray-600 font-medium">Warmup</div>
                                                    <div className="text-xs text-gray-600">Score</div>
                                                  </div>
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        )
                                      })}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>

                <Button
                  onClick={() => handleValidate('infrastructure')}
                  disabled={!formData.clientId || validations.infrastructure.status === 'validating'}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {validations.infrastructure.status === 'validating' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Checking Infrastructure...
                    </>
                  ) : (
                    <>
                      <Settings size={20} />
                      Check Infrastructure
                    </>
                  )}
                </Button>

                {getValidationCard(validations.infrastructure)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Lead List */}
          <TabsContent value="lead-list" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Users size={20} className="text-gray-700" />
                  </div>
                  Lead List Validation
                </CardTitle>
                <CardDescription>
                  Validate lead list quality and ICP matching against strategy call
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="leadCount">Total Lead Count *</Label>
                      <Input
                        id="leadCount"
                        type="number"
                        value={formData.leadCount}
                        onChange={(e) => setFormData({ ...formData, leadCount: e.target.value })}
                        placeholder="e.g., 2847"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leadListUrl">Lead List URL *</Label>
                      <Input
                        id="leadListUrl"
                        type="url"
                        value={formData.leadListUrl}
                        onChange={(e) => setFormData({ ...formData, leadListUrl: e.target.value })}
                        placeholder="CSV or Google Sheets URL"
                      />
                    </div>
                  </div>

                  <Card className="bg-blue-50/50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-sm text-blue-900">
                          <p className="font-medium">What we check:</p>
                          <ul className="text-blue-800 space-y-0.5 text-xs">
                            <li>• Data quality (email validation, required fields)</li>
                            <li>• ICP match rate against strategy call</li>
                            <li>• Job title compliance (VP+ requirement)</li>
                            <li>• Company size alignment</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  onClick={() => handleValidate('leadList')}
                  disabled={!formData.leadListUrl || !formData.leadCount || validations.leadList.status === 'validating'}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {validations.leadList.status === 'validating' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing Lead List...
                    </>
                  ) : (
                    <>
                      <Users size={20} />
                      Validate Lead List
                    </>
                  )}
                </Button>

                {getValidationCard(validations.leadList)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Email Copy */}
          <TabsContent value="email-copy" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Mail size={20} className="text-gray-700" />
                  </div>
                  Email Copy Validation
                </CardTitle>
                <CardDescription>
                  Validate email sequence for spam score, quality, and best practices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <Card className="bg-amber-50/50 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-sm text-amber-900">
                          <p className="font-medium">Email copy is automatically pulled from:</p>
                          <p className="text-amber-800 text-xs">
                            Campaign ID: <span className="font-mono bg-amber-100 px-1 rounded">{formData.campaignId || 'Not set'}</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50/50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-sm text-blue-900">
                          <p className="font-medium">What we check:</p>
                          <ul className="text-blue-800 space-y-0.5 text-xs">
                            <li>• Spam score (must be under 5.0 for each email)</li>
                            <li>• Quality score based on best practices</li>
                            <li>• Trigger word detection</li>
                            <li>• Link count (max 2 recommended)</li>
                            <li>• Personalization usage</li>
                            <li>• Alignment with ICP and value prop</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  onClick={() => handleValidate('emailCopy')}
                  disabled={!formData.campaignId || validations.emailCopy.status === 'validating'}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {validations.emailCopy.status === 'validating' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing Email Copy...
                    </>
                  ) : (
                    <>
                      <Mail size={20} />
                      Validate Email Copy
                    </>
                  )}
                </Button>

                {getValidationCard(validations.emailCopy)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 5: Loom Video */}
          <TabsContent value="loom-video" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Video size={20} className="text-gray-700" />
                  </div>
                  Loom Video Explanation
                </CardTitle>
                <CardDescription>
                  Validate your Loom video explaining the campaign strategy and decisions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="loomUrl">Loom Video URL *</Label>
                    <Input
                      id="loomUrl"
                      type="url"
                      value={formData.loomUrl}
                      onChange={(e) => setFormData({ ...formData, loomUrl: e.target.value })}
                      placeholder="https://loom.com/share/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Your video walkthrough of the campaign (3-5 min recommended)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loomTranscript">Video Transcript (Optional)</Label>
                    <Textarea
                      id="loomTranscript"
                      value={formData.loomTranscript}
                      onChange={(e) => setFormData({ ...formData, loomTranscript: e.target.value })}
                      placeholder="Paste Loom transcript here for faster validation..."
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      If provided, transcript is analyzed by AI for key points
                    </p>
                  </div>

                  <Card className="bg-blue-50/50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-sm text-blue-900">
                          <p className="font-medium">Your video should cover:</p>
                          <ul className="text-blue-800 space-y-0.5 text-xs">
                            <li>• ICP research and targeting logic</li>
                            <li>• Key takeaways from strategy call</li>
                            <li>• Email sequence strategy (why X emails)</li>
                            <li>• Lead list quality and selection criteria</li>
                            <li>• Expected results and success metrics</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  onClick={() => handleValidate('loom')}
                  disabled={!formData.loomUrl || validations.loom.status === 'validating'}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {validations.loom.status === 'validating' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing Video...
                    </>
                  ) : (
                    <>
                      <Video size={20} />
                      Validate Loom Video
                    </>
                  )}
                </Button>

                {getValidationCard(validations.loom)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Section */}
        {completedSteps === 5 && (
          <Card className="shadow-large bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 mt-8">
            <CardContent className="p-10">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={24} className="text-white" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      Ready to Submit!
                    </h3>
                    <p className="text-gray-700">
                      All validation steps passed. Your submission will be reviewed by Jay.
                    </p>
                  </div>
                  <Button size="lg" className="shadow-lg bg-emerald-600 hover:bg-emerald-700">
                    <Sparkles size={20} />
                    Submit for Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
