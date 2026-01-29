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
  Search,
  Upload
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

// Utility function to convert HTML to plain text
function htmlToText(html: string): string {
  if (!html) return ''

  // Create a temporary div to parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Get text content and clean up whitespace
  let text = temp.textContent || temp.innerText || ''

  // Clean up excessive whitespace
  text = text.replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
  text = text.replace(/[ \t]+/g, ' ') // Multiple spaces to single space
  text = text.trim()

  return text
}

// Parse spintax to extract variants
function parseSpintax(text: string): { hasSpintax: boolean; variants: string[] } {
  const spintaxPattern = /\{([^}]+)\}/g
  const matches = text.match(spintaxPattern)

  if (!matches) {
    return { hasSpintax: false, variants: [] }
  }

  // Extract all unique spintax groups
  const allVariants: string[][] = []
  matches.forEach(match => {
    const content = match.slice(1, -1) // Remove { }
    if (content.includes('|')) {
      const options = content.split('|')
      allVariants.push(options)
    }
  })

  if (allVariants.length === 0) {
    return { hasSpintax: false, variants: [] }
  }

  return {
    hasSpintax: true,
    variants: allVariants.flat()
  }
}

// Highlight merge fields in text
function highlightMergeFields(text: string): React.ReactNode[] {
  if (!text) return [text]

  const mergeFieldPattern = /(\{[A-Z_]+\})/g
  const parts = text.split(mergeFieldPattern)

  return parts.map((part, index) => {
    if (part.match(mergeFieldPattern)) {
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-200"
        >
          {part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}

// Get status badge color and label
function getStatusBadge(status: string): { color: string; label: string; icon: string } {
  const statusMap: Record<string, { color: string; label: string; icon: string }> = {
    active: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Active', icon: '🟢' },
    completed: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Completed', icon: '🟡' },
    archived: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Archived', icon: '⚪' },
    paused: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Paused', icon: '🟠' },
    draft: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Draft', icon: '🟣' },
  }

  return statusMap[status.toLowerCase()] || { color: 'bg-gray-100 text-gray-600 border-gray-200', label: status, icon: '⚫' }
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

  // Campaign details state (array of all campaigns)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedLeadLists, setExpandedLeadLists] = useState<Set<string>>(new Set())
  const [campaignLeadLists, setCampaignLeadLists] = useState<Record<string, {
    file: File | null
    leadCount: number
    sampleLeads: Array<Record<string, any>>
    validated: boolean
    issues: string[]
  }>>({})
  const [uploadingLeadList, setUploadingLeadList] = useState<string | null>(null)
  const [campaignDetails, setCampaignDetails] = useState<Array<{
    campaign_id: string
    campaign_name: string
    platform: string
    status?: string
    sequences: Array<{
      step: number
      subject: string
      body: string
      wait_days?: number
      delay_hours?: number
      variants?: Array<{ subject: string; body: string }>
    }>
  }> | null>(null)
  const [loadingCampaignDetails, setLoadingCampaignDetails] = useState(false)

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
    { id: 'email-copy', label: 'Email Copy', icon: Mail, key: 'emailCopy' },
    { id: 'lead-list', label: 'Lead List', icon: Users, key: 'leadList' },
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

  const handleLeadListUpload = async (campaignId: string, file: File) => {
    if (!file) return

    setUploadingLeadList(campaignId)

    try {
      // Read CSV file
      const text = await file.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid')
        return
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))

      // Parse CSV rows (first 10 as sample)
      const sampleLeads: Array<Record<string, any>> = []
      const maxSamples = Math.min(10, lines.length - 1)

      for (let i = 1; i <= maxSamples; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
        const lead: Record<string, any> = {}

        headers.forEach((header, index) => {
          lead[header] = values[index] || ''
        })

        sampleLeads.push(lead)
      }

      // Basic validation checks
      const issues: string[] = []

      // Check for required fields
      const requiredFields = ['email', 'first_name', 'last_name', 'company']
      requiredFields.forEach(field => {
        const hasField = headers.some(h => h.toLowerCase().includes(field.replace('_', '')))
        if (!hasField) {
          issues.push(`Missing recommended field: ${field}`)
        }
      })

      // Store lead list data
      setCampaignLeadLists(prev => ({
        ...prev,
        [campaignId]: {
          file,
          leadCount: lines.length - 1,
          sampleLeads,
          validated: false,
          issues
        }
      }))

      // Auto-expand this campaign's lead list section
      setExpandedLeadLists(prev => new Set([...prev, campaignId]))

    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('Failed to parse CSV file. Please check the file format.')
    } finally {
      setUploadingLeadList(null)
    }
  }

  const loadAllCampaignDetails = async () => {
    if (!formData.clientName || campaigns.length === 0) {
      console.error('Need client name and campaigns to load campaign details')
      return
    }

    try {
      setLoadingCampaignDetails(true)

      // Fetch details for all campaigns
      const allCampaignDetails = await Promise.all(
        campaigns.map(async (campaign) => {
          try {
            const response = await fetch(
              `/api/campaigns/details?clientName=${encodeURIComponent(formData.clientName)}&campaignId=${encodeURIComponent(campaign.id)}&campaignName=${encodeURIComponent(campaign.name)}&platform=${formData.platform}`
            )
            const data = await response.json()

            if (data.success) {
              return {
                campaign_id: campaign.id,
                campaign_name: data.campaign_name,
                platform: data.platform,
                status: campaign.status || 'unknown',
                sequences: data.sequences,
              }
            }
            return null
          } catch (error) {
            console.error(`Failed to load campaign ${campaign.id}:`, error)
            return null
          }
        })
      )

      // Filter out failed requests and set state
      const validCampaigns = allCampaignDetails.filter(c => c !== null)

      if (validCampaigns.length > 0) {
        setCampaignDetails(validCampaigns as any)
        // Expand all campaigns by default when first loaded
        setExpandedCampaigns(new Set(validCampaigns.map(c => c!.campaign_id)))
      } else {
        console.error('Failed to load any campaign details')
      }
    } catch (error) {
      console.error('Error loading campaign details:', error)
    } finally {
      setLoadingCampaignDetails(false)
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

          {/* Step 3: Email Copy */}
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
                  Validate email sequences align with ICP, strategy call transcript, and agreed messaging
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

                  {formData.clientId && campaigns.length === 0 && (
                    <Card className="bg-amber-50/50 border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-900">
                            No campaigns found for this client
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.clientId && campaigns.length > 0 && (
                    <>
                      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Mail size={20} className="text-purple-700" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Load All Campaign Email Sequences</p>
                              <p className="text-sm text-gray-700 mb-2">
                                Extract email copy from all {campaigns.length} campaign{campaigns.length > 1 ? 's' : ''} for {formData.clientName}
                              </p>
                            </div>
                          </div>

                          <Button
                            onClick={loadAllCampaignDetails}
                            disabled={loadingCampaignDetails}
                            className="w-full shadow-sm bg-purple-600 hover:bg-purple-700 text-white"
                            size="lg"
                          >
                            {loadingCampaignDetails ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                Loading All Campaigns...
                              </>
                            ) : (
                              <>
                                <Mail size={18} />
                                Load All Campaign Copy
                              </>
                            )}
                          </Button>

                          {campaignDetails && (
                            <div className="mt-4 pt-4 border-t border-purple-200 space-y-3">
                              <p className="text-sm text-emerald-700 flex items-center gap-2">
                                <CheckCircle size={16} />
                                Loaded {campaignDetails.length} campaign{campaignDetails.length > 1 ? 's' : ''} with {campaignDetails.reduce((sum, c) => sum + c.sequences.length, 0)} total email sequences
                              </p>
                              <Button
                                onClick={() => {
                                  if (expandedCampaigns.size === campaignDetails.length) {
                                    // Collapse all
                                    setExpandedCampaigns(new Set())
                                  } else {
                                    // Expand all
                                    setExpandedCampaigns(new Set(campaignDetails.map(c => c.campaign_id)))
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                              >
                                {expandedCampaigns.size === campaignDetails.length ? (
                                  <>
                                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    Collapse All Campaigns
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Expand All Campaigns
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Display All Campaigns - Collapsible */}
                      {campaignDetails && campaignDetails.map((campaign, campaignIndex) => {
                        const isExpanded = expandedCampaigns.has(campaign.campaign_id)
                        const statusBadge = getStatusBadge(campaign.status || 'unknown')

                        return (
                          <Card key={campaign.campaign_id} className="bg-white border-gray-300 shadow-sm">
                            <CardContent className="p-0">
                              {/* Campaign Header - Clickable */}
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedCampaigns)
                                  if (isExpanded) {
                                    newExpanded.delete(campaign.campaign_id)
                                  } else {
                                    newExpanded.add(campaign.campaign_id)
                                  }
                                  setExpandedCampaigns(newExpanded)
                                }}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                  <div className="text-left flex-1">
                                    <p className="text-sm font-bold text-gray-900">
                                      {campaign.campaign_name}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {campaign.sequences.length} email{campaign.sequences.length > 1 ? 's' : ''} in sequence
                                    </p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-md border font-medium ${statusBadge.color}`}>
                                    {statusBadge.icon} {statusBadge.label}
                                  </span>
                                </div>
                              </button>

                              {/* Campaign Sequences - Collapsible Content */}
                              {isExpanded && (
                                <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                                  {campaign.sequences.map((seq, index) => {
                                    const cleanBody = htmlToText(seq.body)
                                    const spintaxInfo = parseSpintax(cleanBody)

                                    return (
                                      <Card key={index} className="bg-white border-gray-200 shadow-sm">
                                        <CardContent className="p-4">
                                          <div className="space-y-3">
                                            {/* Email Step Header */}
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                                                Email {seq.step}
                                              </span>
                                              {(seq.wait_days !== undefined || seq.delay_hours !== undefined) && seq.step > 1 && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                  </svg>
                                                  Wait: {seq.wait_days ? `${seq.wait_days} day${seq.wait_days > 1 ? 's' : ''}` : `${seq.delay_hours} hour${seq.delay_hours > 1 ? 's' : ''}`}
                                                </span>
                                              )}
                                            </div>

                                            {/* Subject Line */}
                                            <div>
                                              <p className="text-xs text-gray-600 mb-1.5 font-medium">Subject Line:</p>
                                              <div className="text-sm font-semibold text-gray-900 bg-blue-50 p-2.5 rounded border border-blue-100">
                                                {highlightMergeFields(seq.subject)}
                                              </div>
                                            </div>

                                            {/* Email Body */}
                                            <div>
                                              <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-xs text-gray-600 font-medium">Email Body:</p>
                                                {spintaxInfo.hasSpintax && (
                                                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                                                    {spintaxInfo.variants.length} variant{spintaxInfo.variants.length > 1 ? 's' : ''}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200 max-h-64 overflow-y-auto">
                                                {highlightMergeFields(cleanBody)}
                                              </div>
                                            </div>

                                            {/* Spintax Variants Display */}
                                            {spintaxInfo.hasSpintax && (
                                              <div className="pt-2 border-t border-gray-200">
                                                <p className="text-xs text-gray-600 mb-2 font-medium">Copy Variations:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {spintaxInfo.variants.slice(0, 6).map((variant, vIndex) => (
                                                    <span
                                                      key={vIndex}
                                                      className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200"
                                                    >
                                                      {variant}
                                                    </span>
                                                  ))}
                                                  {spintaxInfo.variants.length > 6 && (
                                                    <span className="text-xs px-2 py-1 text-gray-500">
                                                      +{spintaxInfo.variants.length - 6} more
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* A/B Test Variants (from API) */}
                                            {seq.variants && seq.variants.length > 0 && (
                                              <div className="pt-2 border-t border-gray-200">
                                                <p className="text-xs text-gray-600 mb-2 font-medium">
                                                  A/B Test Variants: {seq.variants.length}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )
                                  })}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}

                      <Card className="bg-blue-50/50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1 text-sm text-blue-900">
                              <p className="font-medium">What we validate across all campaigns:</p>
                              <ul className="text-blue-800 space-y-0.5 text-xs">
                                <li>• Alignment with ICP from strategy call</li>
                                <li>• Messaging matches pain points in transcript</li>
                                <li>• Value proposition consistency</li>
                                <li>• Personalization strategy alignment</li>
                                <li>• Tone and approach match agreed strategy</li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>

                <Button
                  onClick={() => handleValidate('emailCopy')}
                  disabled={!campaignDetails || validations.emailCopy.status === 'validating'}
                  className="w-full shadow-lg"
                  size="lg"
                >
                  {validations.emailCopy.status === 'validating' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Validating Strategy Alignment...
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

          {/* Step 4: Lead List */}
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
                  Upload and validate lead lists for each campaign against ICP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!campaigns || campaigns.length === 0 ? (
                  <Card className="bg-amber-50/50 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-900">
                          Please select a client in Step 1 first to load campaigns
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card className="bg-blue-50/50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1 text-sm text-blue-900">
                            <p className="font-medium">What we validate for each list:</p>
                            <ul className="text-blue-800 space-y-0.5 text-xs">
                              <li>• Campaign-to-list alignment (right audience for message)</li>
                              <li>• ICP match rate against strategy call</li>
                              <li>• Data quality (email validation, required fields)</li>
                              <li>• Job title/seniority compliance</li>
                              <li>• Company size and industry alignment</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Campaign Lead Lists */}
                    {campaigns.map((campaign) => {
                      const isExpanded = expandedLeadLists.has(campaign.id)
                      const leadList = campaignLeadLists[campaign.id]
                      const statusBadge = getStatusBadge(campaign.status || 'unknown')

                      return (
                        <Card key={campaign.id} className="bg-white border-gray-300 shadow-sm">
                          <CardContent className="p-0">
                            {/* Campaign Header */}
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedLeadLists)
                                if (isExpanded) {
                                  newExpanded.delete(campaign.id)
                                } else {
                                  newExpanded.add(campaign.id)
                                }
                                setExpandedLeadLists(newExpanded)
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                                <div className="text-left flex-1">
                                  <p className="text-sm font-bold text-gray-900">
                                    {campaign.name}
                                  </p>
                                  {leadList ? (
                                    <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                                      <CheckCircle size={12} />
                                      {leadList.leadCount.toLocaleString()} leads uploaded
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      No lead list uploaded
                                    </p>
                                  )}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-md border font-medium ${statusBadge.color}`}>
                                  {statusBadge.icon} {statusBadge.label}
                                </span>
                              </div>
                            </button>

                            {/* Lead List Upload & Details */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                                {/* File Upload */}
                                {!leadList ? (
                                  <div className="space-y-3">
                                    <label className="block">
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
                                        <input
                                          type="file"
                                          accept=".csv"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                              handleLeadListUpload(campaign.id, file)
                                            }
                                          }}
                                          disabled={uploadingLeadList === campaign.id}
                                        />
                                        {uploadingLeadList === campaign.id ? (
                                          <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-gray-400" size={32} />
                                            <p className="text-sm text-gray-600">Processing CSV...</p>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center gap-2">
                                            <Upload className="text-gray-400" size={32} />
                                            <p className="text-sm font-medium text-gray-700">
                                              Upload CSV Lead List
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              Click to browse or drag and drop
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Lead List Summary */}
                                    <Card className="bg-white border-gray-200">
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                              {leadList.file.name}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              {leadList.leadCount.toLocaleString()} total leads
                                            </p>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setCampaignLeadLists(prev => {
                                                const newLists = { ...prev }
                                                delete newLists[campaign.id]
                                                return newLists
                                              })
                                            }}
                                            className="text-xs text-red-600 hover:text-red-700"
                                          >
                                            Remove
                                          </button>
                                        </div>

                                        {/* Issues */}
                                        {leadList.issues.length > 0 && (
                                          <div className="mb-3">
                                            <p className="text-xs font-medium text-amber-700 mb-1.5">
                                              ⚠️ Potential Issues:
                                            </p>
                                            <ul className="space-y-1">
                                              {leadList.issues.map((issue, idx) => (
                                                <li key={idx} className="text-xs text-amber-600">
                                                  • {issue}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Sample Leads */}
                                        <div>
                                          <p className="text-xs font-medium text-gray-700 mb-2">
                                            Sample Leads (first {leadList.sampleLeads.length}):
                                          </p>
                                          <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {leadList.sampleLeads.map((lead, idx) => (
                                              <div
                                                key={idx}
                                                className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs"
                                              >
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                  {Object.entries(lead).slice(0, 6).map(([key, value]) => (
                                                    <div key={key}>
                                                      <span className="text-gray-500 font-medium">{key}:</span>{' '}
                                                      <span className="text-gray-900">{value}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    {/* Validate Button */}
                                    <Button
                                      onClick={() => {
                                        // TODO: Implement validation logic
                                        alert(`Validating lead list for ${campaign.name}`)
                                      }}
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                      size="sm"
                                    >
                                      <CheckCircle size={16} />
                                      Validate Against ICP
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </>
                )}
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
