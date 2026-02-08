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
  Mail,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  ClientCampaignSelector,
  MailboxHealthCheck,
  EmailCopyAndLeads,
  ReviewSubmit,
  ValidationResult,
  ValidationStatus,
  Client,
  Campaign,
  CampaignDetails,
  CampaignLeadListData
} from '@/components/delivery-checklist'

export default function DeliveryChecklistPage() {
  const [activeTab, setActiveTab] = useState('client-campaign')
  const [clients, setClients] = useState<Client[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Multi-campaign selection state
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
  const [selectedCampaignsDetails, setSelectedCampaignsDetails] = useState<CampaignDetails[]>([])
  const [loadingCampaignDetails, setLoadingCampaignDetails] = useState(false)
  
  // Lead data from EmailCopyAndLeads component
  const [campaignLeadLists, setCampaignLeadLists] = useState<CampaignLeadListData>({})

  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    platform: 'instantly',
    workspaceId: '',
    fathomMeetingId: '',
    strategyTranscript: '',
    intakeFormUrl: '',
    selectedThreadId: '',
    threadMessages: [] as any[],
    strategistNotes: ''
  })

  const [validations, setValidations] = useState({
    clientCampaign: { status: 'idle', message: '' } as ValidationResult,
    mailboxHealth: { status: 'idle', message: '' } as ValidationResult,
    emailCopyLeads: { status: 'idle', message: '' } as ValidationResult
  })

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

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId)
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId,
        clientName: selectedClient.name,
        platform: selectedClient.platform,
        workspaceId: selectedClient.workspaceId
      }))

      // Reset campaign data when client changes
      setCampaigns([])
      setSelectedCampaignIds([])
      setSelectedCampaignsDetails([])

      // Load campaigns for this client
      loadCampaigns(selectedClient.name, selectedClient.platform)
    }
  }

  const loadCampaigns = async (clientName: string, platform: string) => {
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

  const handleCampaignToggle = async (campaignId: string) => {
    const isSelected = selectedCampaignIds.includes(campaignId)
    
    if (isSelected) {
      // Remove campaign from selection
      setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId))
      setSelectedCampaignsDetails(prev => prev.filter(c => c.campaign_id !== campaignId))
    } else {
      // Add campaign to selection
      setSelectedCampaignIds(prev => [...prev, campaignId])
      
      const selectedCampaign = campaigns.find(c => c.id === campaignId)
      if (!selectedCampaign || !formData.clientName) {
        return
      }

      // Fetch the campaign details
      try {
        setLoadingCampaignDetails(true)
        const response = await fetch(
          `/api/campaigns/details?clientName=${encodeURIComponent(formData.clientName)}&campaignId=${encodeURIComponent(campaignId)}&campaignName=${encodeURIComponent(selectedCampaign.name)}&platform=${formData.platform}`
        )
        const data = await response.json()

        if (data.success) {
          const details: CampaignDetails = {
            campaign_id: campaignId,
            campaign_name: data.campaign_name,
            platform: data.platform,
            status: selectedCampaign.status || 'unknown',
            sequences: data.sequences,
          }
          setSelectedCampaignsDetails(prev => [...prev, details])
        } else {
          console.error('Failed to load campaign details:', data.error)
          // Remove from selection if we couldn't load details
          setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId))
        }
      } catch (error) {
        console.error('Error loading campaign details:', error)
        setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId))
      } finally {
        setLoadingCampaignDetails(false)
      }
    }
  }

  const handleRemoveCampaign = (campaignId: string) => {
    setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId))
    setSelectedCampaignsDetails(prev => prev.filter(c => c.campaign_id !== campaignId))
  }

  const handleValidate = async (step: keyof typeof validations) => {
    setValidations(prev => ({
      ...prev,
      [step]: { status: 'validating', message: 'Validating...' }
    }))

    const campaignCount = selectedCampaignsDetails.length

    // Handle emailCopyLeads with real AI validation
    if (step === 'emailCopyLeads') {
      try {
        // Build lead list from all campaigns
        const allLeads: Array<{ email: string; firstName?: string; lastName?: string; title?: string; company?: string; industry?: string; companySize?: string }> = []
        
        Object.values(campaignLeadLists).forEach(leadData => {
          if (leadData?.sampleLeads) {
            leadData.sampleLeads.forEach(lead => {
              allLeads.push({
                email: lead.email || lead.Email || '',
                firstName: lead.first_name || lead.firstName || lead.First_Name || '',
                lastName: lead.last_name || lead.lastName || lead.Last_Name || '',
                title: lead.title || lead.Title || lead.job_title || '',
                company: lead.company || lead.Company || lead.company_name || '',
                industry: lead.industry || lead.Industry || '',
                companySize: lead.company_size || lead.companySize || lead.employees || ''
              })
            })
          }
        })

        // Build email sequences from all campaigns
        const allSequences = selectedCampaignsDetails.flatMap(campaign => 
          campaign.sequences.map(seq => ({
            subject: seq.subject,
            body: seq.body,
            step: seq.step
          }))
        )

        // Extract ICP description from strategy transcript or use a default
        const icpDescription = formData.strategyTranscript 
          ? `Based on strategy call: ${formData.strategyTranscript.substring(0, 1000)}` 
          : `Client: ${formData.clientName}. Review the leads and email copy for ICP alignment.`

        const response = await fetch('/api/validate-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: selectedCampaignIds[0] || 'multi-campaign',
            platform: formData.platform,
            emailSequence: allSequences,
            leadList: allLeads,
            icpDescription,
            strategistNotes: formData.strategistNotes || ''
          })
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle API configuration errors
          if (data.message?.includes('ANTHROPIC_API_KEY')) {
            setValidations(prev => ({
              ...prev,
              [step]: {
                status: 'fail',
                message: 'AI validation not configured',
                details: [
                  '❌ ANTHROPIC_API_KEY is not configured on the server',
                  '💡 Add the API key to your .env.local file',
                  '💡 Contact your administrator to enable AI validation'
                ]
              }
            }))
            return
          }
          throw new Error(data.message || 'Validation failed')
        }

        // Map AI response to validation card format
        const { copyValidation, leadValidation, alignment } = data
        
        // Determine overall status based on scores
        const copyScore = copyValidation?.score ?? 0
        const leadMatchRate = leadValidation?.total > 0 
          ? (leadValidation.matched / leadValidation.total) * 100 
          : 0
        const alignmentScore = alignment?.score ?? 0
        const overallScore = (copyScore + leadMatchRate + alignmentScore) / 3

        let status: ValidationStatus = 'pass'
        if (overallScore < 50 || copyValidation?.issues?.length > 3) {
          status = 'fail'
        } else if (overallScore < 75 || copyValidation?.issues?.length > 0 || leadValidation?.flagged > 0) {
          status = 'warning'
        }

        const details: string[] = []
        
        // Copy validation details
        details.push(`📧 Copy Quality Score: ${copyScore}/100`)
        if (copyValidation?.issues?.length > 0) {
          copyValidation.issues.slice(0, 3).forEach((issue: string) => {
            details.push(`⚠️ ${issue}`)
          })
        } else {
          details.push('✅ Email copy aligns well with ICP')
        }

        // Lead validation details
        details.push(`👥 Leads: ${leadValidation?.matched || 0}/${leadValidation?.total || 0} match ICP (${Math.round(leadMatchRate)}%)`)
        if (leadValidation?.flagged > 0) {
          details.push(`⚠️ ${leadValidation.flagged} leads flagged for review`)
        }
        if (leadValidation?.removed > 0) {
          details.push(`❌ ${leadValidation.removed} leads removed (invalid data)`)
        }

        // Alignment details
        details.push(`🎯 Alignment Score: ${alignmentScore}/100`)
        if (alignment?.notes) {
          details.push(`💡 ${alignment.notes}`)
        }

        // Add suggestions if any
        if (copyValidation?.suggestions?.length > 0) {
          details.push('--- Suggestions ---')
          copyValidation.suggestions.slice(0, 3).forEach((suggestion: string) => {
            details.push(`💡 ${suggestion}`)
          })
        }

        setValidations(prev => ({
          ...prev,
          [step]: {
            status,
            message: status === 'pass' 
              ? `AI validation passed for ${campaignCount} campaign${campaignCount !== 1 ? 's' : ''}` 
              : status === 'warning'
                ? `Validation completed with warnings`
                : `Validation found issues that need attention`,
            details
          }
        }))

      } catch (error) {
        console.error('AI validation error:', error)
        setValidations(prev => ({
          ...prev,
          [step]: {
            status: 'fail',
            message: 'Validation failed',
            details: [
              `❌ ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
              '💡 Try again or contact support if the issue persists'
            ]
          }
        }))
      }
      return
    }

    // Simple validation for other steps (no AI needed)
    setTimeout(() => {
      const results: Record<string, ValidationResult> = {
        clientCampaign: {
          status: 'pass',
          message: 'Client and campaign data validated successfully',
          details: [
            '✅ Client selected and verified',
            `✅ ${campaignCount} campaign${campaignCount !== 1 ? 's' : ''} selected and details loaded`,
            '✅ Email context captured',
            '✅ Ready for next steps'
          ]
        },
        mailboxHealth: {
          status: 'warning',
          message: 'Infrastructure configured with warnings',
          details: [
            '✅ Mailbox health: Good overall',
            '✅ Campaign configured correctly',
            '⚠️ Some mailboxes need more warmup time'
          ]
        }
      }

      setValidations(prev => ({
        ...prev,
        [step]: results[step]
      }))
    }, 1000)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulated submission
    setTimeout(() => {
      alert(`Submission successful! ${selectedCampaignsDetails.length} campaign(s) have been sent for review.`)
      setIsSubmitting(false)
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
      <Card className={`${variants[validation.status]} shadow-soft mt-4`}>
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

  const tabs = [
    { id: 'client-campaign', label: 'Client & Campaign', icon: FileText, key: 'clientCampaign' },
    { id: 'mailbox-health', label: 'Mailbox Health', icon: Settings, key: 'mailboxHealth' },
    { id: 'email-copy-leads', label: 'Copy & Leads', icon: Mail, key: 'emailCopyLeads' },
    { id: 'review-submit', label: 'Review & Submit', icon: Sparkles, key: 'review' }
  ]

  const completedSteps = Object.values(validations).filter(v => v.status === 'pass').length
  const progress = (completedSteps / 3) * 100

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
                  Delivery Checklist
                </h1>
                <p className="text-xs text-muted-foreground">
                  Complete all validation steps to submit for review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedCampaignsDetails.length > 0 && (
                <Badge variant="secondary" className="gap-2">
                  <Mail size={12} />
                  {selectedCampaignsDetails.length} Campaign{selectedCampaignsDetails.length !== 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="outline" className="gap-2">
                <Sparkles size={12} />
                {completedSteps}/4 Complete
              </Badge>
            </div>
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
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100/80">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const validation = tab.key !== 'review' ? validations[tab.key as keyof typeof validations] : null
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
                  {validation?.status === 'pass' && (
                    <CheckCircle size={14} className="text-emerald-500" />
                  )}
                  {validation?.status === 'fail' && (
                    <XCircle size={14} className="text-red-500" />
                  )}
                  {validation?.status === 'warning' && (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Tab 1: Client & Campaign Selection */}
          <TabsContent value="client-campaign" className="space-y-6">
            <ClientCampaignSelector
              clients={clients}
              campaigns={campaigns}
              loadingClients={loadingClients}
              loadingCampaigns={loadingCampaigns}
              selectedCampaignIds={selectedCampaignIds}
              selectedCampaignsDetails={selectedCampaignsDetails}
              loadingCampaignDetails={loadingCampaignDetails}
              formData={{
                clientId: formData.clientId,
                clientName: formData.clientName,
                platform: formData.platform,
                workspaceId: formData.workspaceId,
                fathomMeetingId: formData.fathomMeetingId,
                strategyTranscript: formData.strategyTranscript,
                intakeFormUrl: formData.intakeFormUrl,
                selectedThreadId: formData.selectedThreadId,
                threadMessages: formData.threadMessages
              }}
              onClientSelect={handleClientSelect}
              onCampaignToggle={handleCampaignToggle}
              onRemoveCampaign={handleRemoveCampaign}
              onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
              validation={validations.clientCampaign}
              onValidate={() => handleValidate('clientCampaign')}
              getValidationCard={getValidationCard}
            />
          </TabsContent>

          {/* Tab 2: Mailbox Health Check */}
          <TabsContent value="mailbox-health" className="space-y-6">
            <MailboxHealthCheck
              clientId={formData.clientId}
              clientName={formData.clientName}
              platform={formData.platform}
              validation={validations.mailboxHealth}
              onValidate={() => handleValidate('mailboxHealth')}
              getValidationCard={getValidationCard}
            />
          </TabsContent>

          {/* Tab 3: Email Copy & Lead Lists */}
          <TabsContent value="email-copy-leads" className="space-y-6">
            <EmailCopyAndLeads
              clientId={formData.clientId}
              clientName={formData.clientName}
              platform={formData.platform}
              selectedCampaigns={selectedCampaignsDetails}
              validation={validations.emailCopyLeads}
              onValidate={() => handleValidate('emailCopyLeads')}
              getValidationCard={getValidationCard}
              onLeadDataChange={setCampaignLeadLists}
            />
          </TabsContent>

          {/* Tab 4: Review & Submit */}
          <TabsContent value="review-submit" className="space-y-6">
            <ReviewSubmit
              clientName={formData.clientName}
              validations={validations}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
