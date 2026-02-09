'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Settings,
  Mail,
  Sparkles,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StepProgress, Step } from '@/components/ui/step-progress'
import { 
  AnimatedTabContent, 
  useTabDirection, 
  ProgressRing,
  ValidationBadge 
} from '@/components/ui/animated-tabs'
import { useConfetti } from '@/hooks/use-confetti'

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
  CampaignLeadListData,
  InlineSuggestionsState,
  InlineSuggestionItem
} from '@/components/delivery-checklist'

// Validation cache type
interface ValidationCache {
  clientCampaign: {
    result: ValidationResult | null
    timestamp: number
    fingerprint: string
  }
  mailboxHealth: {
    result: ValidationResult | null
    timestamp: number
    fingerprint: string
  }
  emailCopyLeads: {
    result: ValidationResult | null
    timestamp: number
    fingerprint: string
  }
}

// Mailbox health types from API
interface MailboxHealth {
  email: string
  clientName: string
  platform: 'instantly' | 'bison'
  status: 'healthy' | 'warning' | 'critical'
  warmupScore?: number
  warmupStatus?: string
  issues: string[]
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

// Tab order for direction tracking
const TAB_ORDER = ['client-campaign', 'mailbox-health', 'email-copy-leads', 'review-submit']

export default function DeliveryChecklistPage() {
  const [activeTab, setActiveTab] = useState('client-campaign')
  const [tabError, setTabError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Animation hooks
  const tabDirection = useTabDirection(activeTab, TAB_ORDER)
  const confetti = useConfetti()

  // Multi-campaign selection state
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
  const [selectedCampaignsDetails, setSelectedCampaignsDetails] = useState<CampaignDetails[]>([])
  const [loadingCampaignDetails, setLoadingCampaignDetails] = useState(false)
  
  // Lead data from EmailCopyAndLeads component
  const [campaignLeadLists, setCampaignLeadLists] = useState<CampaignLeadListData>({})
  
  // Inline AI suggestions state
  const [inlineSuggestions, setInlineSuggestions] = useState<InlineSuggestionsState>({})
  
  // Validation cache to avoid re-validation when nothing changed
  const validationCache = useRef<ValidationCache>({
    clientCampaign: { result: null, timestamp: 0, fingerprint: '' },
    mailboxHealth: { result: null, timestamp: 0, fingerprint: '' },
    emailCopyLeads: { result: null, timestamp: 0, fingerprint: '' }
  })

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

  // Check if required fields are filled to proceed past step 1
  const canProceedFromStep1 = useCallback(() => {
    const missing: string[] = []
    if (!formData.clientId) missing.push('Client')
    if (!formData.fathomMeetingId?.trim()) missing.push('Fathom Meeting ID')
    if (!formData.strategyTranscript?.trim()) missing.push('Strategist Call Transcript')
    if (!formData.intakeFormUrl?.trim()) missing.push('Intake Form URL')
    if (selectedCampaignIds.length === 0) missing.push('At least one Campaign')
    return { canProceed: missing.length === 0, missing }
  }, [formData.clientId, formData.fathomMeetingId, formData.strategyTranscript, formData.intakeFormUrl, selectedCampaignIds])

  // Handle tab change with validation
  const handleTabChange = useCallback((newTab: string) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab)
    const newIndex = TAB_ORDER.indexOf(newTab)
    
    // If trying to go forward from step 1, check required fields
    if (currentIndex === 0 && newIndex > 0) {
      const { canProceed, missing } = canProceedFromStep1()
      if (!canProceed) {
        setTabError(`Please fill out required fields: ${missing.join(', ')}`)
        setTimeout(() => setTabError(null), 5000)
        return
      }
    }
    
    setTabError(null)
    setActiveTab(newTab)
  }, [activeTab, canProceedFromStep1])

  // Validate All state
  const [validateAllProgress, setValidateAllProgress] = useState<{
    isRunning: boolean
    currentStep: number
    totalSteps: number
    results: { passed: number; failed: number; warnings: number }
  }>({
    isRunning: false,
    currentStep: 0,
    totalSteps: 3,
    results: { passed: 0, failed: 0, warnings: 0 }
  })

  const [validations, setValidations] = useState({
    clientCampaign: { status: 'idle', message: '' } as ValidationResult,
    mailboxHealth: { status: 'idle', message: '' } as ValidationResult,
    emailCopyLeads: { status: 'idle', message: '' } as ValidationResult
  })
  
  // Success state for submission
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    show: boolean
    submissionId: string
    campaignCount: number
  }>({ show: false, submissionId: '', campaignCount: 0 })

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
      
      // Clear validation cache and reset validation states
      validationCache.current = {
        clientCampaign: { result: null, timestamp: 0, fingerprint: '' },
        mailboxHealth: { result: null, timestamp: 0, fingerprint: '' },
        emailCopyLeads: { result: null, timestamp: 0, fingerprint: '' }
      }
      setValidations({
        clientCampaign: { status: 'idle', message: '' },
        mailboxHealth: { status: 'idle', message: '' },
        emailCopyLeads: { status: 'idle', message: '' }
      })

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

  // Batch load multiple campaigns in parallel
  const handleBatchCampaignSelect = async (campaignIds: string[]) => {
    if (!formData.clientName) return

    // Filter out already selected campaigns
    const newCampaignIds = campaignIds.filter(id => !selectedCampaignIds.includes(id))
    if (newCampaignIds.length === 0) return

    setSelectedCampaignIds(prev => [...prev, ...newCampaignIds])
    setLoadingCampaignDetails(true)

    try {
      // Load all campaign details in parallel
      const detailPromises = newCampaignIds.map(async (campaignId) => {
        const selectedCampaign = campaigns.find(c => c.id === campaignId)
        if (!selectedCampaign) return null

        try {
          const response = await fetch(
            `/api/campaigns/details?clientName=${encodeURIComponent(formData.clientName)}&campaignId=${encodeURIComponent(campaignId)}&campaignName=${encodeURIComponent(selectedCampaign.name)}&platform=${formData.platform}`
          )
          const data = await response.json()

          if (data.success) {
            return {
              campaign_id: campaignId,
              campaign_name: data.campaign_name,
              platform: data.platform,
              status: selectedCampaign.status || 'unknown',
              sequences: data.sequences,
            } as CampaignDetails
          }
        } catch (error) {
          console.error(`Error loading campaign ${campaignId}:`, error)
        }
        return null
      })

      const results = await Promise.all(detailPromises)
      const successfulDetails = results.filter((d): d is CampaignDetails => d !== null)
      
      // Add all successful details
      setSelectedCampaignsDetails(prev => [...prev, ...successfulDetails])
      
      // Remove failed campaign IDs from selection
      const failedIds = newCampaignIds.filter(
        id => !successfulDetails.some(d => d.campaign_id === id)
      )
      if (failedIds.length > 0) {
        setSelectedCampaignIds(prev => prev.filter(id => !failedIds.includes(id)))
      }
    } catch (error) {
      console.error('Error in batch campaign load:', error)
    } finally {
      setLoadingCampaignDetails(false)
    }
  }

  const handleRemoveCampaign = (campaignId: string) => {
    setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId))
    setSelectedCampaignsDetails(prev => prev.filter(c => c.campaign_id !== campaignId))
  }

  // Handle sequence updates from inline suggestions
  const handleSequenceUpdate = useCallback((
    campaignId: string, 
    emailIndex: number, 
    field: 'subject' | 'body', 
    newValue: string
  ) => {
    setSelectedCampaignsDetails(prev => prev.map(campaign => {
      if (campaign.campaign_id !== campaignId) return campaign
      
      const updatedSequences = [...campaign.sequences]
      if (updatedSequences[emailIndex]) {
        updatedSequences[emailIndex] = {
          ...updatedSequences[emailIndex],
          [field]: newValue
        }
      }
      
      return {
        ...campaign,
        sequences: updatedSequences
      }
    }))
  }, [])

  const handleValidate = async (step: keyof typeof validations, forceRevalidate = false) => {
    // Check cache first (unless force re-validate)
    if (!forceRevalidate && step !== 'emailCopyLeads') {
      const cache = validationCache.current[step]
      const currentFingerprint = JSON.stringify({
        clientId: formData.clientId,
        clientName: formData.clientName,
        platform: formData.platform,
        campaignIds: selectedCampaignIds.sort(),
        detailsCount: selectedCampaignsDetails.length
      })
      
      const cacheAge = Date.now() - cache.timestamp
      const maxAge = 5 * 60 * 1000 // 5 minutes
      
      if (cache.result && cache.fingerprint === currentFingerprint && cacheAge < maxAge) {
        console.log(`Using cached validation for ${step} (${Math.round(cacheAge / 1000)}s old)`)
        // Just restore cached result
        setValidations(prev => ({
          ...prev,
          [step]: cache.result!
        }))
        return
      }
    }
    
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

        // Extract validation result from response
        const validation = data.validation
        const score = validation?.score ?? 0
        const issues = validation?.issues || []
        const suggestions = validation?.suggestions || []
        const actionableFixes = validation?.actionableFixes || []

        // Determine status based on score
        let status: ValidationStatus = validation?.status === 'pass' ? 'pass' 
          : validation?.status === 'needs_review' ? 'warning' 
          : validation?.status === 'fail' ? 'fail' 
          : score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail'

        const details: string[] = []
        
        // Summary
        details.push(`📊 Overall Score: ${score}/100`)
        if (validation?.summary) {
          details.push(`💬 ${validation.summary}`)
        }

        // Issues
        const errorIssues = issues.filter((i: any) => i.severity === 'error')
        const warningIssues = issues.filter((i: any) => i.severity === 'warning')
        
        if (errorIssues.length > 0) {
          errorIssues.slice(0, 3).forEach((issue: any) => {
            details.push(`❌ ${issue.message}`)
          })
        }
        if (warningIssues.length > 0) {
          warningIssues.slice(0, 3).forEach((issue: any) => {
            details.push(`⚠️ ${issue.message}`)
          })
        }
        if (issues.length === 0) {
          details.push('✅ No major issues found')
        }

        // Add suggestions
        if (suggestions.length > 0) {
          details.push('--- Suggestions ---')
          suggestions.slice(0, 3).forEach((suggestion: string) => {
            details.push(`💡 ${suggestion}`)
          })
        }
        
        // Process actionable fixes into inline suggestions
        if (actionableFixes.length > 0) {
          details.push(`✨ ${actionableFixes.length} one-click fix${actionableFixes.length !== 1 ? 'es' : ''} available below`)
          
          // Convert to InlineSuggestionItem format and organize by campaign/email
          const newSuggestions: InlineSuggestionsState = {}
          
          // Map email index to campaign - we need to track which campaign each email belongs to
          let emailIndexOffset = 0
          const campaignEmailOffsets: { campaignId: string; startIndex: number; endIndex: number }[] = []
          
          selectedCampaignsDetails.forEach(campaign => {
            campaignEmailOffsets.push({
              campaignId: campaign.campaign_id,
              startIndex: emailIndexOffset,
              endIndex: emailIndexOffset + campaign.sequences.length - 1
            })
            emailIndexOffset += campaign.sequences.length
          })
          
          actionableFixes.forEach((fix: any, idx: number) => {
            const emailIndex = fix.location?.emailIndex ?? 0
            
            // Find which campaign this email belongs to
            const campaignInfo = campaignEmailOffsets.find(
              c => emailIndex >= c.startIndex && emailIndex <= c.endIndex
            )
            
            if (!campaignInfo) return
            
            const localEmailIndex = emailIndex - campaignInfo.startIndex
            const campaignId = campaignInfo.campaignId
            
            const suggestion: InlineSuggestionItem = {
              id: `fix-${Date.now()}-${idx}`,
              type: fix.type || 'body',
              severity: fix.severity || 'warning',
              message: fix.message || 'AI suggested improvement',
              original: fix.original || '',
              suggested: fix.suggested || '',
              location: {
                emailIndex: localEmailIndex,
                field: fix.location?.field || 'body',
                campaignId
              },
              applied: false,
              dismissed: false
            }
            
            if (!newSuggestions[campaignId]) {
              newSuggestions[campaignId] = {}
            }
            if (!newSuggestions[campaignId][localEmailIndex]) {
              newSuggestions[campaignId][localEmailIndex] = []
            }
            newSuggestions[campaignId][localEmailIndex].push(suggestion)
          })
          
          setInlineSuggestions(newSuggestions)
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

    // ===== TAB 1: Client & Campaign Validation =====
    if (step === 'clientCampaign') {
      try {
        const details: string[] = []
        let status: ValidationStatus = 'pass'
        let hasErrors = false
        let hasWarnings = false

        // Check 1: Is a client selected?
        if (!formData.clientId || !formData.clientName) {
          details.push('❌ No client selected')
          hasErrors = true
        } else {
          details.push(`✅ Client selected: ${formData.clientName}`)
        }

        // Check 2: Are campaigns selected?
        if (selectedCampaignIds.length === 0) {
          details.push('❌ No campaigns selected')
          hasErrors = true
        } else {
          details.push(`✅ ${selectedCampaignIds.length} campaign${selectedCampaignIds.length !== 1 ? 's' : ''} selected`)
        }

        // Check 3: Do selected campaigns have sequences?
        const campaignsWithoutSequences = selectedCampaignsDetails.filter(c => !c.sequences || c.sequences.length === 0)
        if (campaignsWithoutSequences.length > 0) {
          details.push(`❌ ${campaignsWithoutSequences.length} campaign${campaignsWithoutSequences.length !== 1 ? 's have' : ' has'} no email sequences`)
          campaignsWithoutSequences.forEach(c => {
            details.push(`   → ${c.campaign_name}`)
          })
          hasErrors = true
        } else if (selectedCampaignsDetails.length > 0) {
          const totalSequences = selectedCampaignsDetails.reduce((sum, c) => sum + c.sequences.length, 0)
          details.push(`✅ ${totalSequences} email sequence${totalSequences !== 1 ? 's' : ''} found`)
        }

        // Check 4: Are there any campaigns in "paused" or "error" status?
        const pausedCampaigns = selectedCampaignsDetails.filter(c => 
          c.status?.toLowerCase() === 'paused' || c.status?.toLowerCase() === 'error'
        )
        if (pausedCampaigns.length > 0) {
          details.push(`⚠️ ${pausedCampaigns.length} campaign${pausedCampaigns.length !== 1 ? 's are' : ' is'} paused or in error state`)
          pausedCampaigns.forEach(c => {
            details.push(`   → ${c.campaign_name} (${c.status})`)
          })
          hasWarnings = true
        }

        // Check 5: Does client context exist?
        if (formData.clientId) {
          try {
            const contextResponse = await fetch(`/api/clients/${encodeURIComponent(formData.clientId)}/context`)
            const contextData = await contextResponse.json()
            
            if (contextData.success && contextData.context) {
              const hasContent = !!(
                contextData.context.icpSummary?.trim() || 
                contextData.context.specialRequirements?.trim() || 
                contextData.context.transcriptNotes?.trim()
              )
              
              if (hasContent) {
                details.push('✅ Client context loaded (ICP/requirements available)')
              } else {
                details.push('⚠️ Client context exists but is empty - add ICP/requirements for better AI validation')
                hasWarnings = true
              }
            } else {
              details.push('⚠️ No client context found - consider adding ICP and requirements')
              hasWarnings = true
            }
          } catch {
            details.push('⚠️ Could not check client context')
            hasWarnings = true
          }
        }

        // Check 6: Email thread context (optional enhancement)
        if (formData.selectedThreadId && formData.threadMessages.length > 0) {
          details.push(`✅ Email thread context loaded (${formData.threadMessages.length} messages)`)
        } else if (formData.strategyTranscript) {
          details.push('✅ Strategy transcript provided')
        } else {
          details.push('💡 Tip: Add email thread or strategy transcript for better AI analysis')
        }

        // Determine overall status
        if (hasErrors) {
          status = 'fail'
        } else if (hasWarnings) {
          status = 'warning'
        }

        const result: ValidationResult = {
          status,
          message: status === 'pass' 
            ? 'Client and campaign data validated successfully'
            : status === 'warning'
              ? 'Validation passed with some recommendations'
              : 'Validation failed - please fix the issues above',
          details
        }

        setValidations(prev => ({ ...prev, [step]: result }))
        
        // Cache the result
        validationCache.current.clientCampaign = {
          result,
          timestamp: Date.now(),
          fingerprint: JSON.stringify({
            clientId: formData.clientId,
            campaignIds: selectedCampaignIds.sort(),
            detailsCount: selectedCampaignsDetails.length
          })
        }
        
      } catch (error) {
        console.error('Client/Campaign validation error:', error)
        setValidations(prev => ({
          ...prev,
          [step]: {
            status: 'fail',
            message: 'Validation error',
            details: [`❌ ${error instanceof Error ? error.message : 'An unexpected error occurred'}`]
          }
        }))
      }
      return
    }

    // ===== TAB 2: Mailbox Health Validation =====
    if (step === 'mailboxHealth') {
      try {
        const details: string[] = []
        let status: ValidationStatus = 'pass'
        let hasErrors = false
        let hasWarnings = false

        // Must have a client selected first
        if (!formData.clientId || !formData.clientName) {
          setValidations(prev => ({
            ...prev,
            [step]: {
              status: 'fail',
              message: 'Please select a client first',
              details: ['❌ No client selected - go to Tab 1 to select a client']
            }
          }))
          return
        }

        // Fetch mailbox health data from the API
        const response = await fetch('/api/mailbox-health')
        const data: MailboxHealthResponse = await response.json()

        if (!data.success) {
          throw new Error('Failed to fetch mailbox health data')
        }

        // Filter mailboxes for the selected client
        const clientMailboxes = data.mailboxes.filter(
          m => m.clientName.toLowerCase() === formData.clientName.toLowerCase()
        )

        if (clientMailboxes.length === 0) {
          details.push(`⚠️ No mailboxes found for ${formData.clientName}`)
          details.push('💡 This could mean:')
          details.push('   → Mailboxes haven\'t been set up yet')
          details.push('   → Client name doesn\'t match API records exactly')
          hasWarnings = true
        } else {
          // Count by status
          const healthy = clientMailboxes.filter(m => m.status === 'healthy').length
          const warning = clientMailboxes.filter(m => m.status === 'warning').length
          const critical = clientMailboxes.filter(m => m.status === 'critical').length
          const total = clientMailboxes.length

          details.push(`📧 Found ${total} mailbox${total !== 1 ? 'es' : ''} for ${formData.clientName}`)
          
          // Summary by status
          if (healthy > 0) {
            details.push(`✅ ${healthy} healthy (ready to send)`)
          }
          if (warning > 0) {
            details.push(`⚠️ ${warning} with warnings (needs review)`)
            hasWarnings = true
          }
          if (critical > 0) {
            details.push(`🚫 ${critical} critical (cannot send)`)
            hasErrors = true
          }

          // Check warmup scores (warn if any < 90)
          const lowWarmupMailboxes = clientMailboxes.filter(m => 
            m.warmupScore !== undefined && m.warmupScore < 90
          )
          if (lowWarmupMailboxes.length > 0) {
            const veryLow = lowWarmupMailboxes.filter(m => (m.warmupScore || 0) < 50)
            if (veryLow.length > 0) {
              details.push(`❌ ${veryLow.length} mailbox${veryLow.length !== 1 ? 'es have' : ' has'} very low warmup score (<50)`)
              veryLow.slice(0, 3).forEach(m => {
                details.push(`   → ${m.email}: ${m.warmupScore}%`)
              })
              if (veryLow.length > 3) {
                details.push(`   → ...and ${veryLow.length - 3} more`)
              }
              hasErrors = true
            } else {
              details.push(`⚠️ ${lowWarmupMailboxes.length} mailbox${lowWarmupMailboxes.length !== 1 ? 'es have' : ' has'} warmup score below 90%`)
              hasWarnings = true
            }
          }

          // Check for banned/paused/disabled mailboxes
          const problematicMailboxes = clientMailboxes.filter(m => 
            m.issues.some(issue => 
              issue.toLowerCase().includes('banned') || 
              issue.toLowerCase().includes('disabled') ||
              issue.toLowerCase().includes('suspended') ||
              issue.toLowerCase().includes('paused')
            )
          )
          if (problematicMailboxes.length > 0) {
            details.push(`🚫 ${problematicMailboxes.length} mailbox${problematicMailboxes.length !== 1 ? 'es are' : ' is'} banned/disabled/paused`)
            problematicMailboxes.slice(0, 3).forEach(m => {
              const mainIssue = m.issues[0] || 'Unknown issue'
              details.push(`   → ${m.email}: ${mainIssue}`)
            })
            if (problematicMailboxes.length > 3) {
              details.push(`   → ...and ${problematicMailboxes.length - 3} more`)
            }
            hasErrors = true
          }

          // Check warmup not enabled
          const noWarmup = clientMailboxes.filter(m =>
            m.issues.some(issue => issue.toLowerCase().includes('warmup not enabled'))
          )
          if (noWarmup.length > 0) {
            details.push(`❌ ${noWarmup.length} mailbox${noWarmup.length !== 1 ? 'es have' : ' has'} warmup not enabled`)
            noWarmup.slice(0, 2).forEach(m => {
              details.push(`   → ${m.email}`)
            })
            hasErrors = true
          }

          // Check warmup not completed
          const warmupNotComplete = clientMailboxes.filter(m =>
            m.issues.some(issue => issue.toLowerCase().includes('warmup not completed'))
          )
          if (warmupNotComplete.length > 0 && warmupNotComplete.length !== noWarmup.length) {
            const justIncomplete = warmupNotComplete.filter(m => 
              !m.issues.some(i => i.toLowerCase().includes('warmup not enabled'))
            )
            if (justIncomplete.length > 0) {
              details.push(`⚠️ ${justIncomplete.length} mailbox${justIncomplete.length !== 1 ? 'es' : ''} still warming up`)
              justIncomplete.slice(0, 2).forEach(m => {
                const warmupIssue = m.issues.find(i => i.toLowerCase().includes('warmup not completed'))
                details.push(`   → ${m.email}: ${warmupIssue || 'In progress'}`)
              })
              hasWarnings = true
            }
          }

          // Check sending capacity (healthy mailboxes)
          const readyToSend = healthy
          if (readyToSend === 0) {
            details.push('❌ No mailboxes ready to send!')
            hasErrors = true
          } else if (readyToSend < 3) {
            details.push(`⚠️ Only ${readyToSend} mailbox${readyToSend !== 1 ? 'es' : ''} ready - consider adding more for better deliverability`)
            hasWarnings = true
          } else {
            details.push(`✅ ${readyToSend} mailbox${readyToSend !== 1 ? 'es' : ''} ready for sending`)
          }

          // Platform info
          const platformMailboxes = clientMailboxes.filter(m => m.platform === formData.platform)
          if (platformMailboxes.length !== clientMailboxes.length) {
            details.push(`💡 Note: ${platformMailboxes.length}/${clientMailboxes.length} mailboxes are on ${formData.platform}`)
          }
        }

        // Add cache info if available
        if (data.cached && data.cacheAge !== undefined) {
          details.push(`📊 Data freshness: ${data.cacheAge}s ago`)
        }

        // Determine overall status
        if (hasErrors) {
          status = 'fail'
        } else if (hasWarnings) {
          status = 'warning'
        }

        const result: ValidationResult = {
          status,
          message: status === 'pass' 
            ? `Mailbox health validated - ${formData.clientName} is ready to send`
            : status === 'warning'
              ? 'Mailbox health has some concerns - review details'
              : 'Mailbox health validation failed - fix issues before launching',
          details
        }

        setValidations(prev => ({ ...prev, [step]: result }))
        
        // Cache the result
        validationCache.current.mailboxHealth = {
          result,
          timestamp: Date.now(),
          fingerprint: JSON.stringify({
            clientId: formData.clientId,
            clientName: formData.clientName,
            platform: formData.platform
          })
        }

      } catch (error) {
        console.error('Mailbox health validation error:', error)
        setValidations(prev => ({
          ...prev,
          [step]: {
            status: 'fail',
            message: 'Failed to check mailbox health',
            details: [
              `❌ ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
              '💡 Try again or check the mailbox health page directly'
            ]
          }
        }))
      }
      return
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Calculate lead counts from campaign lead lists
      const campaignsWithLeadCounts = selectedCampaignsDetails.map(campaign => {
        const leadData = campaignLeadLists[campaign.campaign_id]
        return {
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          leadCount: leadData?.leadCount || 0
        }
      })

      // Parse validation scores from the validation results
      const parseScore = (validation: ValidationResult): number => {
        if (validation.status === 'pass') return 90
        if (validation.status === 'warning') return 70
        if (validation.status === 'fail') return 40
        return 0
      }

      const parseIssues = (validation: ValidationResult): Array<{type: string, message: string, severity: 'error' | 'warning' | 'info'}> => {
        if (!validation.details) return []
        return validation.details
          .filter(d => d.startsWith('⚠️') || d.startsWith('❌'))
          .map(d => ({
            type: d.startsWith('❌') ? 'error' : 'warning',
            message: d.replace(/^[⚠️❌✅]\s*/, ''),
            severity: d.startsWith('❌') ? 'error' as const : 'warning' as const
          }))
      }

      const submissionData = {
        clientId: formData.clientId,
        clientName: formData.clientName,
        platform: formData.platform as 'bison' | 'instantly',
        campaigns: campaignsWithLeadCounts,
        validationResults: {
          emailCopy: {
            score: parseScore(validations.emailCopyLeads),
            issues: parseIssues(validations.emailCopyLeads)
          },
          leadList: {
            score: parseScore(validations.emailCopyLeads), // Same validation covers both
            issues: parseIssues(validations.emailCopyLeads)
          },
          mailboxHealth: {
            score: parseScore(validations.mailboxHealth),
            issues: parseIssues(validations.mailboxHealth)
          }
        },
        strategistNotes: formData.strategistNotes || '',
        submittedBy: 'Current User' // TODO: Get from auth context
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create submission')
      }

      // Success! Show success dialog and celebrate
      setSubmissionSuccess({
        show: true,
        submissionId: data.submission.id,
        campaignCount: campaignsWithLeadCounts.length
      })
      
      // Trigger confetti celebration!
      setTimeout(() => confetti.success(), 300)
    } catch (error) {
      console.error('Submission error:', error)
      // Show error in a toast or inline - for now keeping alert as fallback
      setSubmissionSuccess({
        show: true,
        submissionId: '',
        campaignCount: 0
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validate All - runs all validations in sequence using real validation logic
  const handleValidateAll = async () => {
    if (selectedCampaignsDetails.length === 0) {
      alert('Please select at least one campaign first')
      return
    }

    setValidateAllProgress({
      isRunning: true,
      currentStep: 1,
      totalSteps: 3,
      results: { passed: 0, failed: 0, warnings: 0 }
    })

    const results = { passed: 0, failed: 0, warnings: 0 }

    // Helper to count result
    const countResult = (status: ValidationStatus) => {
      if (status === 'pass') results.passed++
      else if (status === 'warning') results.warnings++
      else if (status === 'fail') results.failed++
    }

    // Step 1: Client/Campaign validation (real)
    setValidateAllProgress(prev => ({ ...prev, currentStep: 1 }))
    await handleValidate('clientCampaign')
    // Small delay to let state update
    await new Promise(r => setTimeout(r, 500))

    // Step 2: Mailbox Health (real)
    setValidateAllProgress(prev => ({ ...prev, currentStep: 2 }))
    await handleValidate('mailboxHealth')
    await new Promise(r => setTimeout(r, 500))

    // Step 3: Email Copy & Leads (actual API validation)
    setValidateAllProgress(prev => ({ ...prev, currentStep: 3 }))
    await handleValidate('emailCopyLeads')
    
    // Wait for final validation to complete
    await new Promise(r => setTimeout(r, 2000))

    setValidateAllProgress({
      isRunning: false,
      currentStep: 3,
      totalSteps: 3,
      results
    })

    // Auto-advance to review tab when complete
    setTimeout(() => {
      setActiveTab('review-submit')
    }, 500)
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

  // Enhanced validation card with re-validate option
  const getValidationCard = (validation: ValidationResult, step?: keyof typeof validations) => {
    if (validation.status === 'idle') return null

    const variants = {
      validating: 'border-blue-200 bg-blue-50',
      pass: 'border-emerald-200 bg-emerald-50',
      fail: 'border-red-200 bg-red-50',
      warning: 'border-amber-200 bg-amber-50'
    }

    const canRevalidate = step && validation.status !== 'validating'

    return (
      <Card className={`${variants[validation.status]} shadow-soft mt-4`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            {getStatusIcon(validation.status)}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold text-gray-900 mb-2">
                  {validation.message}
                </p>
                {canRevalidate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleValidate(step, true)}
                    className="flex-shrink-0 text-gray-500 hover:text-gray-700 -mt-1"
                    title="Re-validate (force fresh check)"
                  >
                    <RefreshCw size={14} className="mr-1" />
                    Re-check
                  </Button>
                )}
              </div>
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
              
              {/* Validate All Button with Progress Ring */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleValidateAll}
                  disabled={validateAllProgress.isRunning || selectedCampaignsDetails.length === 0}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md relative overflow-hidden group"
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  />
                  
                  <span className="relative z-10 flex items-center">
                    {validateAllProgress.isRunning ? (
                      <>
                        <ProgressRing 
                          progress={(validateAllProgress.currentStep / validateAllProgress.totalSteps) * 100}
                          size={18}
                          strokeWidth={2}
                          className="mr-2 text-white"
                        />
                        <span>Step {validateAllProgress.currentStep}/{validateAllProgress.totalSteps}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} className="mr-2" />
                        Validate All
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </header>

      {/* Animated Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12 py-6">
          <StepProgress
            steps={tabs.map((tab, index) => {
              const validation = tab.key !== 'review' ? validations[tab.key as keyof typeof validations] : null
              let status: Step['status'] = 'idle'
              
              if (activeTab === tab.id) {
                status = 'current'
              } else if (validation?.status === 'pass') {
                status = 'complete'
              } else if (validation?.status === 'fail') {
                status = 'error'
              } else if (validation?.status === 'warning') {
                status = 'warning'
              }
              
              // Review tab is complete when all validations pass
              if (tab.key === 'review') {
                const allPass = Object.values(validations).every(v => v.status === 'pass')
                const anyFail = Object.values(validations).some(v => v.status === 'fail')
                if (activeTab === tab.id) {
                  status = 'current'
                } else if (allPass) {
                  status = 'complete'
                } else if (anyFail) {
                  status = 'error'
                }
              }
              
              return {
                id: tab.id,
                label: tab.label,
                status
              }
            })}
            currentStep={TAB_ORDER.indexOf(activeTab)}
          />
          
          {/* Validate All Results Badge */}
          <AnimatePresence>
            {!validateAllProgress.isRunning && (validateAllProgress.results.passed > 0 || validateAllProgress.results.failed > 0 || validateAllProgress.results.warnings > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center mt-4"
              >
                {validateAllProgress.results.failed === 0 && validateAllProgress.results.warnings === 0 ? (
                  <motion.span 
                    className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1.5"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <CheckCircle size={14} />
                    All validation checks passed!
                  </motion.span>
                ) : (
                  <motion.span 
                    className="text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1.5"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    <AlertTriangle size={14} />
                    {validateAllProgress.results.failed + validateAllProgress.results.warnings} issue{(validateAllProgress.results.failed + validateAllProgress.results.warnings) !== 1 ? 's' : ''} need attention
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-8 lg:px-12 py-12">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          {/* Error message for required fields */}
          <AnimatePresence>
            {tabError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
              >
                <AlertTriangle size={18} />
                <span className="font-medium">{tabError}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Tab Navigation with Animated Indicators */}
          <TabsList className="grid w-full grid-cols-4 h-auto p-1.5 bg-gray-100/80 rounded-xl">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              const validation = tab.key !== 'review' ? validations[tab.key as keyof typeof validations] : null
              const isActive = activeTab === tab.id
              const tabIndex = TAB_ORDER.indexOf(tab.id)
              const currentIndex = TAB_ORDER.indexOf(activeTab)
              
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative flex flex-col gap-2 py-3 px-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 group"
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-lg shadow-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Icon size={16} className={isActive ? 'text-gray-900' : 'text-gray-500'} />
                    </motion.div>
                    <span className={`hidden sm:inline text-sm font-medium transition-colors ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {tab.label}
                    </span>
                    
                    {/* Step number for mobile */}
                    <span className="sm:hidden text-xs text-gray-500">{index + 1}</span>
                  </div>
                  
                  {/* Animated validation badge */}
                  <div className="relative z-10">
                    <ValidationBadge status={validation?.status || 'idle'} />
                  </div>
                  
                  {/* Connector arrow */}
                  {index < tabs.length - 1 && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
                      <ChevronRight 
                        size={16} 
                        className={`transition-colors ${
                          tabIndex < currentIndex ? 'text-emerald-500' : 'text-gray-300'
                        }`} 
                      />
                    </div>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Animated Tab Content Container */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: tabDirection === 'forward' ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tabDirection === 'forward' ? -30 : 30 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30,
                duration: 0.25
              }}
            >
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
                  getValidationCard={(v) => getValidationCard(v, 'clientCampaign')}
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
                  getValidationCard={(v) => getValidationCard(v, 'mailboxHealth')}
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
                  getValidationCard={(v) => getValidationCard(v, 'emailCopyLeads')}
                  onLeadDataChange={setCampaignLeadLists}
                  onSequenceUpdate={handleSequenceUpdate}
                  inlineSuggestions={inlineSuggestions}
                  onSuggestionsChange={setInlineSuggestions}
                />
              </TabsContent>

              {/* Tab 4: Review & Submit */}
              <TabsContent value="review-submit" className="space-y-6">
                <ReviewSubmit
                  clientName={formData.clientName}
                  platform={formData.platform}
                  campaigns={selectedCampaignsDetails.map(c => ({
                    campaignId: c.campaign_id,
                    campaignName: c.campaign_name,
                    leadCount: campaignLeadLists[c.campaign_id]?.leadCount || 0,
                    sequenceCount: c.sequences?.length || 0
                  }))}
                  validations={validations}
                  strategistNotes={formData.strategistNotes || ''}
                  onNotesChange={(notes) => setFormData(prev => ({ ...prev, strategistNotes: notes }))}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>

      {/* Animated Success Dialog */}
      <AlertDialog open={submissionSuccess.show} onOpenChange={(open) => !open && setSubmissionSuccess(prev => ({ ...prev, show: false }))}>
        <AlertDialogContent className="overflow-hidden">
          <AnimatePresence>
            {submissionSuccess.show && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {submissionSuccess.submissionId ? (
                      <motion.div 
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                        >
                          <CheckCircle className="text-emerald-600" size={28} />
                        </motion.div>
                        <span>Submission Successful!</span>
                      </motion.div>
                    ) : (
                      <>
                        <XCircle className="text-red-600" size={24} />
                        Submission Failed
                      </>
                    )}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      {submissionSuccess.submissionId ? (
                        <>
                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            Your delivery request has been submitted for review.
                          </motion.p>
                          <motion.div 
                            className="bg-gradient-to-br from-emerald-50 to-gray-50 rounded-lg p-4 space-y-2 border border-emerald-100"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <div className="flex justify-between">
                              <span className="text-gray-600">Submission ID</span>
                              <span className="font-mono text-sm font-semibold text-emerald-700">{submissionSuccess.submissionId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Campaigns</span>
                              <span className="font-semibold">{submissionSuccess.campaignCount}</span>
                            </div>
                          </motion.div>
                          <motion.p 
                            className="text-sm text-gray-600"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            You'll be notified when the reviewer approves or requests changes.
                          </motion.p>
                        </>
                      ) : (
                        <p>Something went wrong. Please try again or contact support.</p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-2">
                  {submissionSuccess.submissionId ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSubmissionSuccess({ show: false, submissionId: '', campaignCount: 0 })
                            // Reset form
                            setSelectedCampaignIds([])
                            setSelectedCampaignsDetails([])
                            setCampaignLeadLists({})
                            setValidations({
                              clientCampaign: { status: 'idle', message: '' },
                              mailboxHealth: { status: 'idle', message: '' },
                              emailCopyLeads: { status: 'idle', message: '' }
                            })
                            setActiveTab('client-campaign')
                          }}
                          className="transition-all hover:scale-105"
                        >
                          Start New Submission
                        </Button>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          onClick={() => window.location.href = '/submissions'}
                          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                        >
                          View Submissions
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <AlertDialogAction onClick={() => setSubmissionSuccess({ show: false, submissionId: '', campaignCount: 0 })}>
                      Close
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
