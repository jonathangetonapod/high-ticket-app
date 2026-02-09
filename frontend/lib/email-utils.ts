// Email Utilities - Merge field handling, text processing, and download helpers
import React from 'react'
import { ProcessedLeadInsights } from '@/components/delivery-checklist/LeadInsights'
import { parseLeadCSVString, validateSingleEmail, leadsToCSV } from '@/lib/lead-validation'

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

/**
 * Normalize field names for matching (handles various formats)
 */
export function normalizeFieldName(field: string): string {
  return field.toLowerCase().replace(/[_\s-]/g, '')
}

/**
 * Find the best matching value from lead data for a field name
 */
export function findLeadValue(lead: Record<string, any>, fieldName: string): string | null {
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

/**
 * Highlight merge fields in text
 */
export function highlightMergeFields(text: string): React.ReactNode[] {
  if (!text) return [text]

  const mergeFieldPattern = /(\{[A-Z_]+\})/g
  const parts = text.split(mergeFieldPattern)

  return parts.map((part, index) => {
    if (part.match(mergeFieldPattern)) {
      return React.createElement('span', {
        key: index,
        className: 'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-200'
      }, part)
    }
    return React.createElement('span', { key: index }, part)
  })
}

/**
 * Highlight merge fields AND spam words in text
 */
export function highlightTextWithSpam(text: string, spamWords: string[]): React.ReactNode[] {
  if (!text) return [text]
  
  // Build a combined pattern for merge fields and spam words
  const mergeFieldPattern = /\{[A-Z_]+\}/g
  
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
      result.push(React.createElement('span', { key: `text-${lastIndex}` }, text.slice(lastIndex, seg.start)))
    }
    
    // Add highlighted segment
    if (seg.type === 'merge') {
      result.push(React.createElement('span', {
        key: `merge-${seg.start}`,
        className: 'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-200'
      }, seg.text))
    } else {
      result.push(React.createElement('span', {
        key: `spam-${seg.start}`,
        className: 'inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300',
        title: 'Spam trigger word'
      }, seg.text))
    }
    
    lastIndex = seg.end
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    result.push(React.createElement('span', { key: 'text-end' }, text.slice(lastIndex)))
  }
  
  return result.length > 0 ? result : [React.createElement('span', { key: 'empty' }, text)]
}

/**
 * Merge email content with lead data
 */
export function mergeEmailWithLead(
  text: string, 
  lead: Record<string, any> | null
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

/**
 * Render merged email with missing fields highlighted
 */
export function renderMergedEmail(
  text: string, 
  lead: Record<string, any> | null
): React.ReactNode[] {
  if (!text) return [text]
  
  const { merged } = mergeEmailWithLead(text, lead)
  
  // Split by placeholder brackets to highlight missing fields
  const placeholderPattern = /(\[[A-Za-z\s]+\])/g
  const parts = merged.split(placeholderPattern)
  
  return parts.map((part, index) => {
    if (part.match(placeholderPattern)) {
      // This is a missing field placeholder
      return React.createElement('span', {
        key: index,
        className: 'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200',
        title: 'Missing field in lead data'
      }, part)
    }
    return React.createElement('span', { key: index }, part)
  })
}

/**
 * Calculate cleaned leads stats
 */
export function getCleanedLeadsStats(insights: ProcessedLeadInsights) {
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

/**
 * Download cleaned leads as CSV (excludes invalid, disposable, and duplicate emails)
 */
export async function downloadCleanedLeads(
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

/**
 * Download issues report as CSV (only problematic emails with reasons)
 */
export function downloadIssuesReport(
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

/**
 * Transform API response to match LeadInsights expected format
 */
export function transformApiResponse(apiResponse: any): ProcessedLeadInsights {
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
