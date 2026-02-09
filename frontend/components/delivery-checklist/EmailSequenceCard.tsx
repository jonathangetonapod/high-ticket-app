'use client'

import { CheckCircle, AlertTriangle, Eye, EyeOff, Shield, Wand2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CampaignSequence, htmlToText, parseSpintax, InlineSuggestionItem } from './types'
import { EmailQualityAnalysis } from './EmailQualityBadge'
import { MergePreviewControls } from './MergePreview'
import { InlineSuggestion, SuggestionsSummary } from './InlineSuggestion'
import { highlightTextWithSpam, renderMergedEmail } from '@/lib/email-utils'
import { EmailAnalysis, getScoreColor } from '@/lib/email-analysis'

interface EmailSequenceCardProps {
  sequence: CampaignSequence
  index: number
  campaignId: string
  analysis: EmailAnalysis | undefined
  suggestions?: InlineSuggestionItem[]
  isPreviewMode: boolean
  previewLead: Record<string, any> | null
  currentLeadIndex: number
  totalLeads: number
  hasLeads: boolean
  isAnalysisExpanded: boolean
  onTogglePreview: () => void
  onNavigateLead: (direction: 'prev' | 'next') => void
  onToggleAnalysis: () => void
  onApplySuggestion?: (suggestion: InlineSuggestionItem) => void
  onDismissSuggestion?: (suggestion: InlineSuggestionItem) => void
}

export function EmailSequenceCard({
  sequence,
  index,
  campaignId,
  analysis,
  suggestions = [],
  isPreviewMode,
  previewLead,
  currentLeadIndex,
  totalLeads,
  hasLeads,
  isAnalysisExpanded,
  onTogglePreview,
  onNavigateLead,
  onToggleAnalysis,
  onApplySuggestion,
  onDismissSuggestion
}: EmailSequenceCardProps) {
  const cleanBody = htmlToText(sequence.body)
  const spintaxInfo = parseSpintax(cleanBody)
  const spamWords = analysis?.spam.spamWordsFound.map(m => m.word) || []
  
  // Filter suggestions for this email's subject and body
  const subjectSuggestions = suggestions.filter(s => s.location.field === 'subject' && !s.applied && !s.dismissed)
  const bodySuggestions = suggestions.filter(s => s.location.field === 'body' && !s.applied && !s.dismissed)
  const appliedCount = suggestions.filter(s => s.applied).length
  const dismissedCount = suggestions.filter(s => s.dismissed).length
  const totalSuggestions = suggestions.length

  return (
    <Card className={`border-gray-200 shadow-sm transition-all ${
      isPreviewMode ? 'bg-sky-50 border-sky-200' : 'bg-white'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Email Step Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                Email {sequence.step}
              </span>
              {spintaxInfo.hasSpintax ? (
                <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-300 flex items-center gap-1">
                  <CheckCircle size={10} />
                  Spintax
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-300 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  No Spintax
                </span>
              )}
              {isPreviewMode && (
                <span className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 border border-sky-300 flex items-center gap-1">
                  <Eye size={10} />
                  Preview Mode
                </span>
              )}
              {/* AI Suggestions Badge */}
              {totalSuggestions > 0 && !isPreviewMode && (
                <SuggestionsSummary 
                  total={totalSuggestions} 
                  applied={appliedCount} 
                  dismissed={dismissedCount} 
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {sequence.wait_days && sequence.step > 1 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Wait: {sequence.wait_days} days
                </span>
              )}
              {/* Preview Toggle Button */}
              <button
                onClick={onTogglePreview}
                className={`text-xs px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
                  isPreviewMode
                    ? 'bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
                title={isPreviewMode ? 'Exit preview mode' : 'Preview with real lead data'}
              >
                {isPreviewMode ? (
                  <>
                    <EyeOff size={12} />
                    Exit Preview
                  </>
                ) : (
                  <>
                    <Eye size={12} />
                    👁️ Preview with real data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Lead Selector - only show when in preview mode */}
          {isPreviewMode && (
            <MergePreviewControls
              hasLeads={hasLeads}
              previewLead={previewLead}
              currentLeadIndex={currentLeadIndex}
              totalLeads={totalLeads}
              onNavigate={onNavigateLead}
            />
          )}

          {/* Subject Line - Only show for first email (follow-ups are replies) */}
          {sequence.step === 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500">Subject:</p>
                {analysis && !isPreviewMode && (
                  <div className="flex items-center gap-2">
                    {subjectSuggestions.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                        <Wand2 size={10} />
                        {subjectSuggestions.length} AI fix{subjectSuggestions.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                    {analysis.subject.score < 70 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {analysis.subject.issues.length} issue{analysis.subject.issues.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getScoreColor(analysis.subject.score).bg} ${getScoreColor(analysis.subject.score).text}`}>
                      {analysis.subject.score}/100
                    </span>
                  </div>
                )}
              </div>
              <div className={`text-sm font-medium p-3 rounded border ${
                isPreviewMode 
                  ? 'bg-white border-sky-200 text-gray-900' 
                  : 'bg-blue-50 border-blue-100 text-gray-900'
              }`}>
                {isPreviewMode 
                  ? renderMergedEmail(sequence.subject, previewLead)
                  : highlightTextWithSpam(sequence.subject, spamWords)
                }
              </div>
              
              {/* Subject Line Suggestions */}
              {!isPreviewMode && subjectSuggestions.length > 0 && (
                <div className="space-y-2 pl-2 border-l-2 border-purple-200">
                  {subjectSuggestions.map((suggestion) => (
                    <InlineSuggestion
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={onApplySuggestion || (() => {})}
                      onDismiss={onDismissSuggestion || (() => {})}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500">Body:</p>
              <div className="flex items-center gap-2">
                {!isPreviewMode && bodySuggestions.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Wand2 size={10} />
                    {bodySuggestions.length} AI fix{bodySuggestions.length !== 1 ? 'es' : ''}
                  </span>
                )}
                {analysis && !isPreviewMode && spamWords.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                    <Shield size={10} />
                    {spamWords.length} spam word{spamWords.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className={`text-sm leading-relaxed p-3 rounded border max-h-48 overflow-y-auto whitespace-pre-wrap ${
              isPreviewMode 
                ? 'bg-white border-sky-200 text-gray-800' 
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              {isPreviewMode 
                ? renderMergedEmail(cleanBody, previewLead)
                : highlightTextWithSpam(cleanBody, spamWords)
              }
            </div>
            
            {/* Body Suggestions */}
            {!isPreviewMode && bodySuggestions.length > 0 && (
              <div className="space-y-2 pl-2 border-l-2 border-purple-200">
                {bodySuggestions.map((suggestion) => (
                  <InlineSuggestion
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApply={onApplySuggestion || (() => {})}
                    onDismiss={onDismissSuggestion || (() => {})}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Email Quality Analysis - Collapsible */}
          {analysis && !isPreviewMode && (
            <EmailQualityAnalysis
              analysis={analysis}
              isExpanded={isAnalysisExpanded}
              onToggle={onToggleAnalysis}
              isFirstEmail={sequence.step === 1}
            />
          )}

          {/* Preview hint when not in preview mode but leads are available */}
          {!isPreviewMode && hasLeads && (
            <p className="text-xs text-gray-400 italic">
              💡 Click "Preview with real data" to see how this email looks with actual lead info
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
