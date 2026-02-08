'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Mail,
  Users,
  Loader2,
  Info,
  CheckCircle,
  AlertTriangle,
  Upload,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Download,
  FileWarning,
  Shield,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CampaignDetails,
  LeadListData,
  CampaignLeadListData,
  ValidationResult,
  htmlToText,
  parseSpintax,
  getStatusBadge
} from './types'
import { LeadInsights as LeadInsightsComponent, ProcessedLeadInsights } from './LeadInsights'
import { leadsToCSV, Lead, parseLeadCSVString, validateSingleEmail } from '@/lib/lead-validation'
import {
  analyzeEmailCopy,
  getSpamWordPositions,
  getScoreColor,
  getScoreLabel,
  EmailAnalysis
} from '@/lib/email-analysis'

// Transform API response to match LeadInsights expected format
function transformApiResponse(apiResponse: any): ProcessedLeadInsights {
  const { stats, fieldCoverage, distributions, issues, sampleRows } = apiResponse
  
  // Convert fieldCoverage object to array
  const fieldCoverageArray = Object.entries(fieldCoverage || {}).map(([field, data]: [string, any]) => ({
    field,
    count: data?.count || 0,
    percentage: data?.percentage || 0
  }))
  
  // Calculate quality score from valid/total ratio
  const qualityScore = stats?.totalRows > 0 
    ? Math.round((stats.validRows / stats.totalRows) * 100) 
    : 0
  
  // Convert distributions to array format
  const convertDistribution = (dist: Record<string, number> | undefined) => {
    if (!dist) return []
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    return Object.entries(dist)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([value, count]) => ({
        value,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
  }
  
  // Convert sample rows to record format
  const sampleData = (sampleRows || []).map((row: any) => ({
    email: row.email || null,
    firstName: row.firstName || null,
    lastName: row.lastName || null,
    company: row.company || null,
    title: row.title || null,
    industry: row.industry || null
  }))
  
  return {
    summary: {
      totalLeads: stats?.totalRows || 0,
      validLeads: stats?.validRows || 0,
      invalidLeads: stats?.invalidRows || 0,
      duplicatesFound: stats?.duplicates || 0
    },
    fieldCoverage: fieldCoverageArray,
    dataQualityScore: qualityScore,
    distributions: {
      jobTitles: convertDistribution(distributions?.titles),
      industries: convertDistribution(distributions?.industries),
      companySizes: convertDistribution(distributions?.companySizes),
      emailDomains: convertDistribution(distributions?.domains)
    },
    issues: {
      invalidEmails: issues?.invalidEmails || [],
      disposableEmails: issues?.disposableEmails || [],
      genericEmails: issues?.genericEmails || [],
      duplicateEmails: issues?.duplicateEmails || []
    },
    sampleData
  }
}

// Download cleaned leads as CSV (excludes invalid, disposable, and duplicate emails)
async function downloadCleanedLeads(
  file: File,
  insights: ProcessedLeadInsights,
  campaignName: string
) {
  // Re-parse the original CSV
  const csvText = await file.text()
  const parsed = parseLeadCSVString(csvText)
  
  // Create a set of all problematic emails for fast lookup
  const problematicEmails = new Set<string>([
    ...insights.issues.invalidEmails.map(e => e.toLowerCase()),
    ...insights.issues.disposableEmails.map(e => e.toLowerCase()),
    ...insights.issues.duplicateEmails.map(e => e.toLowerCase())
  ])
  
  // Filter to only valid leads
  const cleanedLeads = parsed.leads.filter(lead => {
    const email = lead.email?.toLowerCase()?.trim()
    if (!email) return false
    
    // Check against our issues list
    if (problematicEmails.has(email)) return false
    
    // Double-check email validation
    const validation = validateSingleEmail(email)
    return validation.isValid && !validation.isDisposable
  })
  
  // Generate CSV with original columns
  const csv = leadsToCSV(cleanedLeads, parsed.headers)
  
  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${campaignName.replace(/[^a-z0-9]/gi, '_')}_cleaned_leads_${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Download issues report as CSV (only problematic emails with reasons)
function downloadIssuesReport(
  insights: ProcessedLeadInsights,
  campaignName: string
) {
  // Build issues array with email, issue_type, and details
  const issues: { email: string; issue_type: string; details: string }[] = []
  
  for (const email of insights.issues.invalidEmails) {
    issues.push({
      email,
      issue_type: 'invalid_email',
      details: 'Email format is invalid or malformed'
    })
  }
  
  for (const email of insights.issues.disposableEmails) {
    issues.push({
      email,
      issue_type: 'disposable_email',
      details: 'Email domain is a known disposable/temporary email service'
    })
  }
  
  for (const email of insights.issues.genericEmails) {
    issues.push({
      email,
      issue_type: 'generic_email',
      details: 'Role-based email address (e.g., info@, support@, admin@)'
    })
  }
  
  for (const email of insights.issues.duplicateEmails) {
    issues.push({
      email,
      issue_type: 'duplicate',
      details: 'Email appears multiple times in the list'
    })
  }
  
  if (issues.length === 0) {
    alert('No issues found to export!')
    return
  }
  
  // Generate CSV
  const headers = ['email', 'issue_type', 'details']
  const rows = [headers.join(',')]
  
  for (const issue of issues) {
    const escapedDetails = issue.details.includes(',') 
      ? `"${issue.details}"` 
      : issue.details
    rows.push(`${issue.email},${issue.issue_type},${escapedDetails}`)
  }
  
  const csv = rows.join('\n')
  
  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${campaignName.replace(/[^a-z0-9]/gi, '_')}_issues_report_${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Calculate cleaned leads stats
function getCleanedLeadsStats(insights: ProcessedLeadInsights) {
  const totalIssues = 
    insights.issues.invalidEmails.length +
    insights.issues.disposableEmails.length +
    insights.issues.duplicateEmails.length
  
  const cleanedCount = insights.summary.totalLeads - totalIssues
  
  return {
    cleanedCount: Math.max(0, cleanedCount),
    removedCount: totalIssues,
    invalidCount: insights.issues.invalidEmails.length,
    disposableCount: insights.issues.disposableEmails.length,
    duplicateCount: insights.issues.duplicateEmails.length,
    genericCount: insights.issues.genericEmails.length // flagged but not removed
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

// Highlight merge fields AND spam words in text
function highlightTextWithSpam(text: string, spamWords: string[]): React.ReactNode[] {
  if (!text) return [text]
  
  // Build a combined pattern for merge fields and spam words
  const mergeFieldPattern = /\{[A-Z_]+\}/g
  const spamPatterns = spamWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  
  // Create segments with positions
  interface Segment {
    start: number
    end: number
    type: 'merge' | 'spam'
    text: string
  }
  
  const segments: Segment[] = []
  
  // Find merge fields
  let match
  const mergeRegex = new RegExp(mergeFieldPattern, 'g')
  while ((match = mergeRegex.exec(text)) !== null) {
    segments.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'merge',
      text: match[0]
    })
  }
  
  // Find spam words
  for (const spamWord of spamWords) {
    const spamRegex = new RegExp(`\\b${spamWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    while ((match = spamRegex.exec(text)) !== null) {
      // Don't highlight if it's inside a merge field
      const isInsideMerge = segments.some(s => 
        s.type === 'merge' && match!.index >= s.start && match!.index < s.end
      )
      if (!isInsideMerge) {
        segments.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'spam',
          text: match[0]
        })
      }
    }
  }
  
  // Sort by position
  segments.sort((a, b) => a.start - b.start)
  
  // Remove overlapping segments (keep first)
  const cleanSegments: Segment[] = []
  for (const seg of segments) {
    const overlaps = cleanSegments.some(s => 
      (seg.start >= s.start && seg.start < s.end) ||
      (seg.end > s.start && seg.end <= s.end)
    )
    if (!overlaps) {
      cleanSegments.push(seg)
    }
  }
  
  // Build result
  const result: React.ReactNode[] = []
  let lastIndex = 0
  
  for (const seg of cleanSegments) {
    // Add text before segment
    if (seg.start > lastIndex) {
      result.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, seg.start)}</span>)
    }
    
    // Add highlighted segment
    if (seg.type === 'merge') {
      result.push(
        <span
          key={`merge-${seg.start}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-200"
        >
          {seg.text}
        </span>
      )
    } else {
      result.push(
        <span
          key={`spam-${seg.start}`}
          className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300"
          title="Spam trigger word"
        >
          {seg.text}
        </span>
      )
    }
    
    lastIndex = seg.end
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    result.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>)
  }
  
  return result.length > 0 ? result : [<span key="empty">{text}</span>]
}

// Email Quality Analysis Score Meter Component
function ScoreMeter({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' }) {
  const colors = getScoreColor(score)
  const width = size === 'sm' ? 'w-24' : 'w-32'
  const height = size === 'sm' ? 'h-2' : 'h-3'
  
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
      <div className={`${width} ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${colors.text}`}>{score}</span>
    </div>
  )
}

// Collapsible Email Quality Analysis Section
function EmailQualityAnalysis({ 
  analysis, 
  isExpanded, 
  onToggle 
}: { 
  analysis: EmailAnalysis
  isExpanded: boolean
  onToggle: () => void
}) {
  const overallColors = getScoreColor(analysis.overallScore)
  const spamColors = getScoreColor(analysis.spam.score)
  const subjectColors = getScoreColor(analysis.subject.score)
  
  return (
    <div className="mt-3 border rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Email Quality Analysis</span>
          <span className={`text-xs px-2 py-0.5 rounded ${overallColors.bg} ${overallColors.text} font-bold`}>
            {analysis.overallScore}/100
          </span>
          <span className={`text-xs ${overallColors.text}`}>
            {getScoreLabel(analysis.overallScore)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t bg-gray-50/50">
          {/* Subject Line Analysis */}
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-purple-500" />
              <span className="text-xs font-semibold text-gray-700">Subject Line</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${subjectColors.bg} ${subjectColors.text} font-medium`}>
                {analysis.subject.score}/100
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${analysis.subject.hasPersonalization ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600">Personalization</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${analysis.subject.hasPowerWords ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600">Power Words</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${!analysis.subject.hasAllCaps ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-gray-600">No ALL CAPS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${analysis.subject.length >= 20 && analysis.subject.length <= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-gray-600">Length ({analysis.subject.length} chars)</span>
              </div>
            </div>
            
            {analysis.subject.issues.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                <p className="text-xs font-medium text-red-700 mb-1">Issues:</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {analysis.subject.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysis.subject.suggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-xs font-medium text-blue-700 mb-1">Suggestions:</p>
                <ul className="text-xs text-blue-600 space-y-0.5">
                  {analysis.subject.suggestions.map((sug, i) => (
                    <li key={i}>• {sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Spam Analysis */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={12} className="text-orange-500" />
              <span className="text-xs font-semibold text-gray-700">Spam Score</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${spamColors.bg} ${spamColors.text} font-medium`}>
                {analysis.spam.score}/100
              </span>
              <span className="text-xs text-gray-500">(100 = clean)</span>
            </div>
            
            {analysis.spam.spamWordsFound.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  Spam trigger words found ({analysis.spam.spamWordsFound.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.spam.spamWordsFound.map((match, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 border border-red-200"
                    >
                      {match.word}
                      {match.count > 1 && <span className="ml-1 text-red-500">×{match.count}</span>}
                      <span className="ml-1 text-red-400 text-[10px]">
                        ({match.locations.join(', ')})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle size={12} />
                  No spam trigger words detected!
                </p>
              </div>
            )}
            
            {analysis.spam.warnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-600 space-y-0.5">
                {analysis.spam.warnings.map((warning, i) => (
                  <p key={i} className="flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Normalize field names for matching (handles various formats)
function normalizeFieldName(field: string): string {
  return field.toLowerCase().replace(/[_\s-]/g, '')
}

// Map common merge field variations to standard names
const fieldMappings: Record<string, string[]> = {
  firstname: ['first_name', 'firstName', 'first', 'fname', 'givenname'],
  lastname: ['last_name', 'lastName', 'last', 'lname', 'surname', 'familyname'],
  company: ['company_name', 'companyName', 'organization', 'org', 'business'],
  title: ['job_title', 'jobTitle', 'position', 'role', 'jobtitle'],
  email: ['email_address', 'emailAddress', 'mail'],
  industry: ['sector', 'vertical'],
  city: ['location', 'town'],
  state: ['region', 'province'],
  country: ['nation'],
  phone: ['telephone', 'phonenumber', 'phone_number', 'mobile']
}

// Find the best matching value from lead data for a field name
function findLeadValue(lead: Record<string, any>, fieldName: string): string | null {
  const normalized = normalizeFieldName(fieldName)
  
  // Direct match first
  for (const [key, value] of Object.entries(lead)) {
    if (normalizeFieldName(key) === normalized && value) {
      return String(value)
    }
  }
  
  // Check field mappings
  for (const [standard, variations] of Object.entries(fieldMappings)) {
    if (normalized === standard || variations.some(v => normalizeFieldName(v) === normalized)) {
      // Try to find any matching variation in lead data
      for (const [key, value] of Object.entries(lead)) {
        const keyNorm = normalizeFieldName(key)
        if (keyNorm === standard || variations.some(v => normalizeFieldName(v) === keyNorm)) {
          if (value) return String(value)
        }
      }
    }
  }
  
  return null
}

// Merge email content with lead data
function mergeEmailWithLead(
  text: string, 
  lead: Record<string, any> | null,
  returnMissingFields?: boolean
): { merged: string; missingFields: string[] } {
  const missingFields: string[] = []
  
  if (!text) return { merged: text, missingFields }
  
  // Handle various merge field formats:
  // {{FIRST_NAME}}, {{first_name}}, {FIRST_NAME}, {first_name}, [[first_name]], [[FIRST_NAME]]
  const mergeFieldPattern = /\{\{([A-Za-z_]+)\}\}|\{([A-Z_]+)\}|\[\[([A-Za-z_]+)\]\]/g
  
  const merged = text.replace(mergeFieldPattern, (match, doublebraceField, singlebraceField, bracketField) => {
    const fieldName = doublebraceField || singlebraceField || bracketField
    
    if (!lead) {
      // No lead data - show placeholder
      const displayName = fieldName.replace(/_/g, ' ').toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      missingFields.push(fieldName)
      return `[${displayName}]`
    }
    
    const value = findLeadValue(lead, fieldName)
    
    if (value) {
      return value
    } else {
      // Field not found in lead data
      missingFields.push(fieldName)
      const displayName = fieldName.replace(/_/g, ' ').toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      return `[${displayName}]`
    }
  })
  
  return { merged, missingFields }
}

// Render merged email with missing fields highlighted
function renderMergedEmail(
  text: string, 
  lead: Record<string, any> | null
): React.ReactNode[] {
  if (!text) return [text]
  
  const { merged, missingFields } = mergeEmailWithLead(text, lead)
  
  // Split by placeholder brackets to highlight missing fields
  const placeholderPattern = /(\[[A-Za-z\s]+\])/g
  const parts = merged.split(placeholderPattern)
  
  return parts.map((part, index) => {
    if (part.match(placeholderPattern)) {
      // This is a missing field placeholder
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200"
          title="Missing field in lead data"
        >
          {part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}

interface EmailCopyAndLeadsProps {
  clientId: string
  clientName: string
  platform: string
  selectedCampaigns: CampaignDetails[]
  validation: ValidationResult
  onValidate: () => void
  getValidationCard: (validation: ValidationResult) => React.ReactNode
  onLeadDataChange?: (leadData: CampaignLeadListData) => void
}

export function EmailCopyAndLeads({
  clientId,
  clientName,
  platform,
  selectedCampaigns,
  validation,
  onValidate,
  getValidationCard,
  onLeadDataChange
}: EmailCopyAndLeadsProps) {
  const [campaignLeadLists, setCampaignLeadLists] = useState<CampaignLeadListData>({})
  const [uploadingCampaignId, setUploadingCampaignId] = useState<string | null>(null)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [campaignInsights, setCampaignInsights] = useState<Record<string, ProcessedLeadInsights>>({})
  const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null)
  
  // Preview state - tracks which emails are in preview mode and which lead index to show
  const [previewLeadIndex, setPreviewLeadIndex] = useState<Record<string, number>>({})
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({})
  
  // Sync lead data to parent when it changes (must be in useEffect, not during render)
  useEffect(() => {
    onLeadDataChange?.(campaignLeadLists)
  }, [campaignLeadLists, onLeadDataChange])
  
  // Email quality analysis state - tracks which analysis sections are expanded
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({})
  
  // Compute email analysis for all campaigns (memoized to run on render)
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
  
  // Toggle analysis section expansion
  const toggleAnalysisExpanded = (key: string) => {
    setExpandedAnalysis(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Toggle preview for a specific email (using campaignId_stepNumber as key)
  const togglePreview = (campaignId: string, step: number) => {
    const key = `${campaignId}_${step}`
    setShowPreview(prev => ({ ...prev, [key]: !prev[key] }))
    // Initialize lead index if not set
    if (!previewLeadIndex[key]) {
      setPreviewLeadIndex(prev => ({ ...prev, [key]: 0 }))
    }
  }

  // Navigate between leads in preview
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

  // Get current lead for preview
  const getPreviewLead = (campaignId: string, step: number): Record<string, any> | null => {
    const key = `${campaignId}_${step}`
    const leadData = campaignLeadLists[campaignId]
    if (!leadData?.sampleLeads?.length) return null
    const index = previewLeadIndex[key] || 0
    return leadData.sampleLeads[index] || null
  }

  // Initialize all campaigns as expanded when campaigns first load
  const campaignIds = selectedCampaigns.map(c => c.campaign_id).join(',')
  useEffect(() => {
    if (selectedCampaigns.length > 0) {
      setExpandedCampaigns(prev => {
        // Only initialize if currently empty (first load)
        if (prev.size === 0) {
          return new Set(selectedCampaigns.map(c => c.campaign_id))
        }
        return prev
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignIds])

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

  const handleLeadListUpload = async (campaignId: string, file: File) => {
    if (!file) return

    setUploadingCampaignId(campaignId)
    setProcessingCampaignId(campaignId)

    try {
      // First, do local parsing for immediate preview
      const text = await file.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid')
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
      const newLeadData = {
        file,
        leadCount: lines.length - 1,
        sampleLeads,
        validated: false,
        issues
      }
      setCampaignLeadLists(prev => ({ ...prev, [campaignId]: newLeadData }))

      // Now send to API for deeper processing and insights
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
        
        // Update lead count from insights if available
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
      alert('Failed to parse CSV file. Please check the file format.')
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
    // Also clear insights when removing lead list
    setCampaignInsights(prev => {
      const next = { ...prev }
      delete next[campaignId]
      return next
    })
  }

  // No client selected
  if (!clientId) {
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
            Review email sequences and upload lead lists for ICP validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="bg-amber-50/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  Please select a client and campaigns in Step 1 first
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    )
  }

  // No campaigns selected
  if (selectedCampaigns.length === 0) {
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
            Review email sequences and upload lead lists for ICP validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="bg-amber-50/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  Please select one or more campaigns in Step 1 to view their email sequences
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    )
  }

  // Calculate total stats
  const totalSequences = selectedCampaigns.reduce((sum, c) => sum + c.sequences.length, 0)
  const campaignsWithLeads = Object.keys(campaignLeadLists).filter(id => campaignLeadLists[id]).length
  const allHaveLeads = campaignsWithLeads === selectedCampaigns.length

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
              <div className="flex gap-2">
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
          {selectedCampaigns.map((campaign) => {
            const statusBadge = getStatusBadge(campaign.status || 'unknown')
            const isExpanded = expandedCampaigns.has(campaign.campaign_id)
            const leadListData = campaignLeadLists[campaign.campaign_id]
            const isUploading = uploadingCampaignId === campaign.campaign_id

            return (
              <Card key={campaign.campaign_id} className="border-gray-200 overflow-hidden">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleCampaignExpanded(campaign.campaign_id)}
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
                        {campaignInsights[campaign.campaign_id] && (
                          <>
                            <span className="text-emerald-400">•</span>
                            <span className={`font-medium ${
                              campaignInsights[campaign.campaign_id].dataQualityScore >= 90 ? 'text-emerald-700' :
                              campaignInsights[campaign.campaign_id].dataQualityScore >= 70 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {campaignInsights[campaign.campaign_id].dataQualityScore}% quality
                            </span>
                          </>
                        )}
                      </span>
                    )}
                    {processingCampaignId === campaign.campaign_id && (
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
                      {/* Left Side: Email Sequences (Read-only) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Mail size={18} className="text-gray-600" />
                          <h3 className="font-semibold text-gray-900">Email Sequences</h3>
                          <span className="text-xs text-gray-500">({campaign.sequences.length} emails)</span>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {campaign.sequences.map((seq, index) => {
                            const cleanBody = htmlToText(seq.body)
                            const spintaxInfo = parseSpintax(cleanBody)
                            const previewKey = `${campaign.campaign_id}_${seq.step}`
                            const isPreviewMode = showPreview[previewKey] || false
                            const previewLead = getPreviewLead(campaign.campaign_id, seq.step)
                            const currentLeadIndex = previewLeadIndex[previewKey] || 0
                            const hasLeads = (campaignLeadLists[campaign.campaign_id]?.sampleLeads?.length || 0) > 0
                            const totalLeads = campaignLeadLists[campaign.campaign_id]?.sampleLeads?.length || 0
                            
                            // Get email analysis for this sequence
                            const analysis = emailAnalyses[previewKey]
                            const isAnalysisExpanded = expandedAnalysis[previewKey] || false
                            const spamWords = analysis?.spam.spamWordsFound.map(m => m.word) || []

                            return (
                              <Card key={index} className={`border-gray-200 shadow-sm transition-all ${
                                isPreviewMode ? 'bg-sky-50 border-sky-200' : 'bg-white'
                              }`}>
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    {/* Email Step Header */}
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                                          Email {seq.step}
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
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {seq.wait_days && seq.step > 1 && (
                                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            Wait: {seq.wait_days} days
                                          </span>
                                        )}
                                        {/* Preview Toggle Button */}
                                        <button
                                          onClick={() => togglePreview(campaign.campaign_id, seq.step)}
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

                                    {/* Preview Lead Selector - only show when in preview mode and has leads */}
                                    {isPreviewMode && (
                                      <div className="flex items-center justify-between p-2 bg-sky-100 rounded-lg border border-sky-200">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-sky-800">
                                            Previewing with:
                                          </span>
                                          {hasLeads && previewLead ? (
                                            <span className="text-xs bg-white px-2 py-1 rounded border border-sky-300 text-sky-900 font-mono">
                                              {previewLead.email || previewLead.Email || 
                                               `${previewLead.first_name || previewLead.firstName || ''} ${previewLead.last_name || previewLead.lastName || ''}`.trim() ||
                                               `Lead ${currentLeadIndex + 1}`}
                                            </span>
                                          ) : (
                                            <span className="text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200 text-amber-700">
                                              No leads uploaded - using placeholders
                                            </span>
                                          )}
                                        </div>
                                        {hasLeads && totalLeads > 1 && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => navigateLead(campaign.campaign_id, seq.step, 'prev')}
                                              className="p-1 rounded hover:bg-sky-200 text-sky-700 transition-colors"
                                              title="Previous lead"
                                            >
                                              <ChevronLeft size={16} />
                                            </button>
                                            <span className="text-xs text-sky-700 min-w-[3rem] text-center">
                                              {currentLeadIndex + 1} / {totalLeads}
                                            </span>
                                            <button
                                              onClick={() => navigateLead(campaign.campaign_id, seq.step, 'next')}
                                              className="p-1 rounded hover:bg-sky-200 text-sky-700 transition-colors"
                                              title="Next lead"
                                            >
                                              <ChevronRight size={16} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Subject Line */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-gray-500">Subject:</p>
                                        {analysis && !isPreviewMode && (
                                          <div className="flex items-center gap-2">
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
                                          ? renderMergedEmail(seq.subject, previewLead)
                                          : highlightTextWithSpam(seq.subject, spamWords)
                                        }
                                      </div>
                                    </div>

                                    {/* Email Body */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-gray-500">Body:</p>
                                        {analysis && !isPreviewMode && spamWords.length > 0 && (
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                                            <Shield size={10} />
                                            {spamWords.length} spam word{spamWords.length !== 1 ? 's' : ''}
                                          </span>
                                        )}
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
                                    </div>

                                    {/* Email Quality Analysis - Collapsible */}
                                    {analysis && !isPreviewMode && (
                                      <EmailQualityAnalysis
                                        analysis={analysis}
                                        isExpanded={isAnalysisExpanded}
                                        onToggle={() => toggleAnalysisExpanded(previewKey)}
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
                          })}
                        </div>
                      </div>

                      {/* Right Side: Lead List Upload */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Users size={18} className="text-gray-600" />
                          <h3 className="font-semibold text-gray-900">This Campaign's Leads</h3>
                        </div>

                        {/* Upload Zone */}
                        {!leadListData ? (
                          <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                              <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleLeadListUpload(campaign.campaign_id, file)
                                  }
                                }}
                                disabled={isUploading}
                              />
                              {isUploading ? (
                                <div className="flex flex-col items-center gap-3">
                                  <Loader2 className="animate-spin text-blue-500" size={32} />
                                  <p className="text-sm text-gray-600">Processing CSV...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3">
                                  <Upload className="text-gray-400" size={32} />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      Upload CSV Lead List
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      For: {campaign.campaign_name}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </label>
                        ) : (
                          <div className="space-y-4">
                            {/* Lead List Summary */}
                            <Card className="bg-emerald-50 border-emerald-200">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <CheckCircle size={20} className="text-emerald-600 mt-0.5" />
                                    <div>
                                      <p className="font-medium text-emerald-900">
                                        {leadListData.file?.name || 'Lead list uploaded'}
                                      </p>
                                      <p className="text-sm text-emerald-700">
                                        {leadListData.leadCount.toLocaleString()} leads ready for ICP validation
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeLeadList(campaign.campaign_id)}
                                    className="text-xs text-red-600 hover:text-red-700 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Issues Warning */}
                            {leadListData.issues.length > 0 && (
                              <Card className="bg-amber-50 border-amber-200">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-800 mb-2">
                                        Potential Issues Detected:
                                      </p>
                                      <ul className="space-y-1">
                                        {leadListData.issues.map((issue, idx) => (
                                          <li key={idx} className="text-xs text-amber-700">
                                            • {issue}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Sample Leads Preview */}
                            <Card className="bg-white border-gray-200">
                              <CardContent className="p-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">
                                  Sample Leads (first {Math.min(5, leadListData.sampleLeads.length)}):
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {leadListData.sampleLeads.slice(0, 5).map((lead, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-gray-50 p-3 rounded border text-xs"
                                    >
                                      <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(lead).slice(0, 6).map(([key, value]) => (
                                          <div key={key} className="truncate">
                                            <span className="text-gray-500">{key}:</span>{' '}
                                            <span className="text-gray-900 font-medium">{value as string}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Lead Insights Section */}
                            {processingCampaignId === campaign.campaign_id && (
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

                            {campaignInsights[campaign.campaign_id] && processingCampaignId !== campaign.campaign_id && (
                              <>
                                <LeadInsightsComponent 
                                  insights={campaignInsights[campaign.campaign_id]} 
                                  isLoading={false}
                                  error={null}
                                />
                                
                                {/* Download Buttons */}
                                {(() => {
                                  const stats = getCleanedLeadsStats(campaignInsights[campaign.campaign_id])
                                  return (
                                    <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                                      <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                          <Download size={18} className="text-emerald-600" />
                                          <h4 className="font-semibold text-emerald-900">Export Cleaned Data</h4>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3">
                                          {/* Download Cleaned Leads Button */}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700"
                                            onClick={() => {
                                              if (leadListData?.file) {
                                                downloadCleanedLeads(
                                                  leadListData.file,
                                                  campaignInsights[campaign.campaign_id],
                                                  campaign.campaign_name
                                                )
                                              }
                                            }}
                                          >
                                            <Download size={14} className="mr-2" />
                                            <span className="flex items-center gap-1">
                                              Download
                                              <span className="font-bold text-emerald-600">
                                                {stats.cleanedCount.toLocaleString()}
                                              </span>
                                              Cleaned Leads
                                            </span>
                                          </Button>
                                          
                                          {/* Download Issues Report Button */}
                                          {stats.removedCount > 0 && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 border-amber-300 bg-white hover:bg-amber-50 text-amber-700"
                                              onClick={() => {
                                                downloadIssuesReport(
                                                  campaignInsights[campaign.campaign_id],
                                                  campaign.campaign_name
                                                )
                                              }}
                                            >
                                              <FileWarning size={14} className="mr-2" />
                                              Download Issues Report
                                            </Button>
                                          )}
                                        </div>
                                        
                                        {/* Stats Summary */}
                                        <div className="text-xs text-gray-600 pt-2 border-t border-emerald-100">
                                          <span className="text-emerald-600 font-medium">
                                            ✓ {stats.cleanedCount.toLocaleString()} valid
                                          </span>
                                          {stats.removedCount > 0 && (
                                            <span className="text-red-500 ml-3">
                                              ✕ {stats.removedCount.toLocaleString()} removed
                                              <span className="text-gray-400 ml-1">
                                                ({stats.invalidCount} invalid, {stats.disposableCount} disposable, {stats.duplicateCount} duplicate)
                                              </span>
                                            </span>
                                          )}
                                          {stats.genericCount > 0 && (
                                            <span className="text-amber-500 ml-3">
                                              ⚠ {stats.genericCount} generic (included but flagged)
                                            </span>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )
                                })()}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
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
                  <li>• Spintax usage for deliverability ({
                    selectedCampaigns.reduce((sum, c) => 
                      sum + c.sequences.filter(s => parseSpintax(htmlToText(s.body)).hasSpintax).length, 0
                    )}/{totalSequences} emails have spintax)</li>
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
          disabled={
            !allHaveLeads ||
            validation.status === 'validating'
          }
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
