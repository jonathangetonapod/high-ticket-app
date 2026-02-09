'use client'

import { Mail, Users, Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CampaignDetails, LeadListData, getStatusBadge, htmlToText, InlineSuggestionItem } from './types'
import { EmailSequenceCard } from './EmailSequenceCard'
import { LeadUploader } from './LeadUploader'
import { DownloadButtons } from './DownloadButtons'
import { LeadInsights as LeadInsightsComponent, ProcessedLeadInsights } from './LeadInsights'
import { EmailAnalysis, analyzeEmailCopy } from '@/lib/email-analysis'

interface CampaignAccordionProps {
  campaign: CampaignDetails
  isExpanded: boolean
  leadListData: LeadListData | null
  insights: ProcessedLeadInsights | undefined
  isUploading: boolean
  isProcessing: boolean
  emailAnalyses: Record<string, EmailAnalysis>
  expandedAnalysis: Record<string, boolean>
  showPreview: Record<string, boolean>
  previewLeadIndex: Record<string, number>
  suggestions?: Record<number, InlineSuggestionItem[]>
  onToggleExpanded: () => void
  onUploadLeadList: (file: File) => void
  onRemoveLeadList: () => void
  onToggleAnalysis: (key: string) => void
  onTogglePreview: (step: number) => void
  onNavigateLead: (step: number, direction: 'prev' | 'next') => void
  onApplySuggestion?: (suggestion: InlineSuggestionItem) => void
  onDismissSuggestion?: (suggestion: InlineSuggestionItem) => void
}

export function CampaignAccordion({
  campaign,
  isExpanded,
  leadListData,
  insights,
  isUploading,
  isProcessing,
  emailAnalyses,
  expandedAnalysis,
  showPreview,
  previewLeadIndex,
  suggestions = {},
  onToggleExpanded,
  onUploadLeadList,
  onRemoveLeadList,
  onToggleAnalysis,
  onTogglePreview,
  onNavigateLead,
  onApplySuggestion,
  onDismissSuggestion
}: CampaignAccordionProps) {
  const statusBadge = getStatusBadge(campaign.status || 'unknown')

  // Get preview lead for a specific step
  const getPreviewLead = (step: number): Record<string, any> | null => {
    const key = `${campaign.campaign_id}_${step}`
    if (!leadListData?.sampleLeads?.length) return null
    const index = previewLeadIndex[key] || 0
    return leadListData.sampleLeads[index] || null
  }

  return (
    <Card className="border-gray-200 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={onToggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {leadListData ? (
              <CheckCircle size={18} className="text-emerald-500" />
            ) : (
              <Mail size={18} className="text-gray-400" />
            )}
            <span className="font-semibold text-gray-900">{campaign.campaign_name}</span>
          </div>
          <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.color}`}>
            {statusBadge.icon} {statusBadge.label}
          </span>
          <span className="text-xs text-gray-500">
            {campaign.sequences.length} emails
          </span>
          {leadListData && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
              {leadListData.leadCount.toLocaleString()} leads
              {insights && (
                <>
                  <span className="text-emerald-400">•</span>
                  <span className={`font-medium ${
                    insights.dataQualityScore >= 90 ? 'text-emerald-700' :
                    insights.dataQualityScore >= 70 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {insights.dataQualityScore}% quality
                  </span>
                </>
              )}
            </span>
          )}
          {isProcessing && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Analyzing...
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <CardContent className="p-4 border-t bg-gray-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Email Sequences */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Mail size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Email Sequences</h3>
                <span className="text-xs text-gray-500">({campaign.sequences.length} emails)</span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {campaign.sequences.map((seq, index) => {
                  const previewKey = `${campaign.campaign_id}_${seq.step}`
                  const isPreviewMode = showPreview[previewKey] || false
                  const currentLeadIndex = previewLeadIndex[previewKey] || 0
                  const hasLeads = (leadListData?.sampleLeads?.length || 0) > 0
                  const totalLeads = leadListData?.sampleLeads?.length || 0

                  return (
                    <EmailSequenceCard
                      key={index}
                      sequence={seq}
                      index={index}
                      campaignId={campaign.campaign_id}
                      analysis={emailAnalyses[previewKey]}
                      suggestions={suggestions[seq.step - 1] || []}
                      isPreviewMode={isPreviewMode}
                      previewLead={getPreviewLead(seq.step)}
                      currentLeadIndex={currentLeadIndex}
                      totalLeads={totalLeads}
                      hasLeads={hasLeads}
                      isAnalysisExpanded={expandedAnalysis[previewKey] || false}
                      onTogglePreview={() => onTogglePreview(seq.step)}
                      onNavigateLead={(direction) => onNavigateLead(seq.step, direction)}
                      onToggleAnalysis={() => onToggleAnalysis(previewKey)}
                      onApplySuggestion={onApplySuggestion}
                      onDismissSuggestion={onDismissSuggestion}
                    />
                  )
                })}
              </div>
            </div>

            {/* Right Side: Lead List Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Users size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">This Campaign's Leads</h3>
              </div>

              <LeadUploader
                campaignName={campaign.campaign_name}
                leadListData={leadListData}
                isUploading={isUploading}
                onUpload={onUploadLeadList}
                onRemove={onRemoveLeadList}
              />

              {/* Lead Insights Section */}
              {isProcessing && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                      <div>
                        <p className="font-medium text-blue-900">Analyzing Lead Quality...</p>
                        <p className="text-sm text-blue-700">Validating emails, checking ICP match, detecting duplicates</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {insights && !isProcessing && (
                <>
                  <LeadInsightsComponent 
                    insights={insights} 
                    isLoading={false}
                    error={null}
                  />
                  
                  <DownloadButtons
                    file={leadListData?.file ?? undefined}
                    insights={insights}
                    campaignName={campaign.campaign_name}
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
