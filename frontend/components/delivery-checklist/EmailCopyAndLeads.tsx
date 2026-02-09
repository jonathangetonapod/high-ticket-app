'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Mail, Loader2, Info, Sparkles, Wand2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CampaignDetails,
  CampaignSequence,
  LeadListData,
  CampaignLeadListData,
  ValidationResult,
  htmlToText,
  parseSpintax,
  InlineSuggestionItem,
  InlineSuggestionsState
} from './types'
import { CampaignAccordion } from './CampaignAccordion'
import { ProcessedLeadInsights } from './LeadInsights'
import { analyzeEmailCopy, EmailAnalysis } from '@/lib/email-analysis'
import { transformApiResponse } from '@/lib/email-utils'

interface EmailCopyAndLeadsProps {
  clientId: string
  clientName: string
  platform: string
  selectedCampaigns: CampaignDetails[]
  validation: ValidationResult
  onValidate: () => void
  getValidationCard: (validation: ValidationResult) => React.ReactNode
  onLeadDataChange?: (leadData: CampaignLeadListData) => void
  onSequenceUpdate?: (campaignId: string, emailIndex: number, field: 'subject' | 'body', newValue: string) => void
  inlineSuggestions?: InlineSuggestionsState
  onSuggestionsChange?: (suggestions: InlineSuggestionsState) => void
}

export function EmailCopyAndLeads({
  clientId,
  clientName,
  platform,
  selectedCampaigns,
  validation,
  onValidate,
  getValidationCard,
  onLeadDataChange,
  onSequenceUpdate,
  inlineSuggestions: externalSuggestions,
  onSuggestionsChange
}: EmailCopyAndLeadsProps) {
  // State management
  const [campaignLeadLists, setCampaignLeadLists] = useState<CampaignLeadListData>({})
  const [uploadingCampaignId, setUploadingCampaignId] = useState<string | null>(null)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [campaignInsights, setCampaignInsights] = useState<Record<string, ProcessedLeadInsights>>({})
  const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null)
  const [previewLeadIndex, setPreviewLeadIndex] = useState<Record<string, number>>({})
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({})
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({})
  
  // Inline suggestions state (local if not provided externally)
  const [localSuggestions, setLocalSuggestions] = useState<InlineSuggestionsState>({})
  const suggestions = externalSuggestions ?? localSuggestions
  
  // Helper to update suggestions - supports both controlled and uncontrolled modes
  const updateSuggestions = useCallback((updater: (prev: InlineSuggestionsState) => InlineSuggestionsState) => {
    if (onSuggestionsChange) {
      const newValue = updater(externalSuggestions ?? {})
      onSuggestionsChange(newValue)
    } else {
      setLocalSuggestions(updater)
    }
  }, [externalSuggestions, onSuggestionsChange])
  
  // Track fixes applied count
  const [fixesAppliedCount, setFixesAppliedCount] = useState(0)
  
  // Sync lead data to parent when it changes
  useEffect(() => {
    onLeadDataChange?.(campaignLeadLists)
  }, [campaignLeadLists, onLeadDataChange])
  
  // Compute email analysis for all campaigns (memoized)
  const emailAnalyses = useMemo(() => {
    const analyses: Record<string, EmailAnalysis> = {}
    for (const campaign of selectedCampaigns) {
      for (const seq of campaign.sequences) {
        const key = `${campaign.campaign_id}_${seq.step}`
        const cleanBody = htmlToText(seq.body)
        analyses[key] = analyzeEmailCopy(seq.subject, cleanBody)
      }
    }
    return analyses
  }, [selectedCampaigns])
  
  // Initialize all campaigns as expanded when campaigns first load
  const campaignIds = selectedCampaigns.map(c => c.campaign_id).join(',')
  useEffect(() => {
    if (selectedCampaigns.length > 0) {
      setExpandedCampaigns(prev => {
        if (prev.size === 0) {
          return new Set(selectedCampaigns.map(c => c.campaign_id))
        }
        return prev
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignIds])

  // Handlers
  const toggleCampaignExpanded = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      if (next.has(campaignId)) {
        next.delete(campaignId)
      } else {
        next.add(campaignId)
      }
      return next
    })
  }

  const toggleAnalysisExpanded = (key: string) => {
    setExpandedAnalysis(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const togglePreview = (campaignId: string, step: number) => {
    const key = `${campaignId}_${step}`
    setShowPreview(prev => ({ ...prev, [key]: !prev[key] }))
    if (!previewLeadIndex[key]) {
      setPreviewLeadIndex(prev => ({ ...prev, [key]: 0 }))
    }
  }

  const navigateLead = (campaignId: string, step: number, direction: 'prev' | 'next') => {
    const key = `${campaignId}_${step}`
    const leadData = campaignLeadLists[campaignId]
    if (!leadData?.sampleLeads?.length) return
    
    const maxIndex = leadData.sampleLeads.length - 1
    const currentIndex = previewLeadIndex[key] || 0
    
    let newIndex: number
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex
    } else {
      newIndex = currentIndex < maxIndex ? currentIndex + 1 : 0
    }
    
    setPreviewLeadIndex(prev => ({ ...prev, [key]: newIndex }))
  }

  const handleLeadListUpload = async (campaignId: string, file: File) => {
    if (!file) return

    setUploadingCampaignId(campaignId)
    setProcessingCampaignId(campaignId)

    try {
      // Local parsing for immediate preview
      const text = await file.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        toast.error('CSV file appears to be empty or invalid')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))

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

      const issues: string[] = []
      const requiredFields = ['email', 'first_name', 'last_name', 'company']
      requiredFields.forEach(field => {
        const hasField = headers.some(h => h.toLowerCase().includes(field.replace('_', '')))
        if (!hasField) {
          issues.push(`Missing recommended field: ${field}`)
        }
      })

      // Update local state for immediate preview
      const newLeadData: LeadListData = {
        file,
        leadCount: lines.length - 1,
        sampleLeads,
        validated: false,
        issues
      }
      setCampaignLeadLists(prev => ({ ...prev, [campaignId]: newLeadData }))

      // Send to API for deeper processing and insights
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaignId', campaignId)
      formData.append('clientId', clientId)

      const response = await fetch('/api/process-leads', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const apiResponse = await response.json()
        const insights = transformApiResponse(apiResponse)
        setCampaignInsights(prev => ({ ...prev, [campaignId]: insights }))
        
        if (insights.summary.totalLeads) {
          setCampaignLeadLists(prev => ({
            ...prev,
            [campaignId]: {
              ...prev[campaignId]!,
              leadCount: insights.summary.totalLeads,
              validated: true
            }
          }))
        }
      } else {
        console.error('Failed to process leads:', await response.text())
      }
    } catch (error) {
      console.error('Error parsing/processing CSV:', error)
      toast.error('Failed to parse CSV file. Please check the file format.')
    } finally {
      setUploadingCampaignId(null)
      setProcessingCampaignId(null)
    }
  }

  const removeLeadList = (campaignId: string) => {
    setCampaignLeadLists(prev => {
      const next = { ...prev }
      delete next[campaignId]
      return next
    })
    setCampaignInsights(prev => {
      const next = { ...prev }
      delete next[campaignId]
      return next
    })
  }

  // Handle applying an inline suggestion
  const handleApplySuggestion = useCallback((suggestion: InlineSuggestionItem) => {
    const { location, original, suggested } = suggestion
    const campaignId = location.campaignId
    
    if (!campaignId) return
    
    // Find the campaign and update the sequence
    const campaign = selectedCampaigns.find(c => c.campaign_id === campaignId)
    if (!campaign) return
    
    const sequence = campaign.sequences[location.emailIndex]
    if (!sequence) return
    
    // Apply the fix by replacing text
    const currentValue = location.field === 'subject' ? sequence.subject : sequence.body
    const newValue = currentValue.replace(original, suggested)
    
    // Notify parent of the sequence update
    onSequenceUpdate?.(campaignId, location.emailIndex, location.field, newValue)
    
    // Mark suggestion as applied
    updateSuggestions((prev) => {
      const campaignSuggestions = { ...prev[campaignId] }
      const emailSuggestions = [...(campaignSuggestions[location.emailIndex] || [])]
      const suggestionIndex = emailSuggestions.findIndex(s => s.id === suggestion.id)
      
      if (suggestionIndex >= 0) {
        emailSuggestions[suggestionIndex] = { ...emailSuggestions[suggestionIndex], applied: true }
      }
      
      campaignSuggestions[location.emailIndex] = emailSuggestions
      return { ...prev, [campaignId]: campaignSuggestions }
    })
    
    setFixesAppliedCount(prev => prev + 1)
  }, [selectedCampaigns, onSequenceUpdate, updateSuggestions])

  // Handle dismissing an inline suggestion
  const handleDismissSuggestion = useCallback((suggestion: InlineSuggestionItem) => {
    const { location } = suggestion
    const campaignId = location.campaignId
    
    if (!campaignId) return
    
    updateSuggestions((prev) => {
      const campaignSuggestions = { ...prev[campaignId] }
      const emailSuggestions = [...(campaignSuggestions[location.emailIndex] || [])]
      const suggestionIndex = emailSuggestions.findIndex(s => s.id === suggestion.id)
      
      if (suggestionIndex >= 0) {
        emailSuggestions[suggestionIndex] = { ...emailSuggestions[suggestionIndex], dismissed: true }
      }
      
      campaignSuggestions[location.emailIndex] = emailSuggestions
      return { ...prev, [campaignId]: campaignSuggestions }
    })
  }, [updateSuggestions])

  // Get suggestions for a specific campaign
  const getCampaignSuggestions = useCallback((campaignId: string): Record<number, InlineSuggestionItem[]> => {
    return suggestions[campaignId] || {}
  }, [suggestions])
  
  // Count total active suggestions
  const totalActiveSuggestions = useMemo(() => {
    let count = 0
    Object.values(suggestions).forEach(campaignSuggestions => {
      Object.values(campaignSuggestions).forEach(emailSuggestions => {
        count += emailSuggestions.filter(s => !s.applied && !s.dismissed).length
      })
    })
    return count
  }, [suggestions])

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Mail size={20} className="text-gray-700" />
          </div>
          Email Copy & Lead Lists
        </CardTitle>
        <CardDescription>Review email sequences and upload lead lists for ICP validation</CardDescription>
      </CardHeader>
      <CardContent>
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">{message}</p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )

  if (!clientId) return <EmptyState message="Please select a client and campaigns in Step 1 first" />
  if (selectedCampaigns.length === 0) return <EmptyState message="Please select one or more campaigns in Step 1 to view their email sequences" />

  // Calculate stats
  const totalSequences = selectedCampaigns.reduce((sum, c) => sum + c.sequences.length, 0)
  const campaignsWithLeads = Object.keys(campaignLeadLists).filter(id => campaignLeadLists[id]).length
  const allHaveLeads = campaignsWithLeads === selectedCampaigns.length
  const spintaxCount = selectedCampaigns.reduce((sum, c) => 
    sum + c.sequences.filter(s => parseSpintax(htmlToText(s.body)).hasSpintax).length, 0
  )

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Mail size={20} className="text-gray-700" />
          </div>
          Email Copy & Lead Lists
        </CardTitle>
        <CardDescription>
          Review email sequences and upload lead lists for {selectedCampaigns.length} campaign{selectedCampaigns.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Header */}
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedCampaigns.length} Campaign{selectedCampaigns.length !== 1 ? 's' : ''} Selected
                </p>
                <p className="text-sm text-gray-600">
                  {totalSequences} total email sequences • {platform} platform
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* AI Suggestions Status */}
                {totalActiveSuggestions > 0 && (
                  <span className="text-sm px-2 py-1 rounded border bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                    <Wand2 size={14} />
                    {totalActiveSuggestions} AI fix{totalActiveSuggestions !== 1 ? 'es' : ''} available
                  </span>
                )}
                {fixesAppliedCount > 0 && (
                  <span className="text-sm px-2 py-1 rounded border bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <Check size={14} />
                    {fixesAppliedCount} fix{fixesAppliedCount !== 1 ? 'es' : ''} applied
                  </span>
                )}
                <span className={`text-sm px-2 py-1 rounded border ${
                  allHaveLeads 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  {campaignsWithLeads}/{selectedCampaigns.length} lead lists uploaded
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Accordions */}
        <div className="space-y-4">
          {selectedCampaigns.map((campaign) => (
            <CampaignAccordion
              key={campaign.campaign_id}
              campaign={campaign}
              isExpanded={expandedCampaigns.has(campaign.campaign_id)}
              leadListData={campaignLeadLists[campaign.campaign_id] ?? null}
              insights={campaignInsights[campaign.campaign_id]}
              isUploading={uploadingCampaignId === campaign.campaign_id}
              isProcessing={processingCampaignId === campaign.campaign_id}
              emailAnalyses={emailAnalyses}
              expandedAnalysis={expandedAnalysis}
              showPreview={showPreview}
              previewLeadIndex={previewLeadIndex}
              suggestions={getCampaignSuggestions(campaign.campaign_id)}
              onToggleExpanded={() => toggleCampaignExpanded(campaign.campaign_id)}
              onUploadLeadList={(file) => handleLeadListUpload(campaign.campaign_id, file)}
              onRemoveLeadList={() => removeLeadList(campaign.campaign_id)}
              onToggleAnalysis={toggleAnalysisExpanded}
              onTogglePreview={(step) => togglePreview(campaign.campaign_id, step)}
              onNavigateLead={(step, direction) => navigateLead(campaign.campaign_id, step, direction)}
              onApplySuggestion={handleApplySuggestion}
              onDismissSuggestion={handleDismissSuggestion}
            />
          ))}
        </div>

        {/* Validation Info */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-blue-900">
                <p className="font-medium">What we validate for {selectedCampaigns.length > 1 ? 'all campaigns' : 'this campaign'}:</p>
                <ul className="text-blue-800 space-y-0.5 text-xs">
                  <li>• Email copy alignment with ICP from strategy call</li>
                  <li>• Lead list ICP match rate against strategy requirements</li>
                  <li>• Spintax usage for deliverability ({spintaxCount}/{totalSequences} emails have spintax)</li>
                  <li>• Data quality and required field presence</li>
                  <li>• Job title/seniority compliance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validate Button */}
        <Button
          onClick={onValidate}
          disabled={!allHaveLeads || validation.status === 'validating'}
          className="w-full shadow-lg"
          size="lg"
        >
          {validation.status === 'validating' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Validating {selectedCampaigns.length} Campaign{selectedCampaigns.length !== 1 ? 's' : ''} Against ICP...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Validate All Campaigns Against ICP
            </>
          )}
        </Button>

        {!allHaveLeads && (
          <p className="text-sm text-amber-600 text-center">
            Upload lead lists for all {selectedCampaigns.length} campaigns before validating
          </p>
        )}

        {getValidationCard(validation)}
      </CardContent>
    </Card>
  )
}
