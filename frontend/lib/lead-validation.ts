/**
 * Lead List Validation Utilities
 * 
 * Provides comprehensive local validation for lead lists including:
 * - CSV parsing with column detection
 * - Email validation and disposable domain detection
 * - Competitor detection
 * - ICP matching and scoring
 * - Deduplication
 * - Report generation
 */

// =============================================================================
// Types
// =============================================================================

export interface Lead {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  title?: string
  industry?: string
  companySize?: string
  linkedinUrl?: string
  phone?: string
  website?: string
  location?: string
  source?: string
  [key: string]: any // extra columns
}

export interface ICPCriteria {
  titles?: string[]
  industries?: string[]
  companySizes?: string[]
  excludeDomains?: string[]
  requiredFields?: string[]
  titleKeywords?: string[] // partial match on titles
  excludeTitleKeywords?: string[] // titles to exclude
  minScore?: number // minimum score to be considered valid
}

export interface LeadValidationResult {
  valid: Lead[]
  flagged: { lead: Lead; reason: string }[]
  removed: { lead: Lead; reason: string }[]
  stats: { total: number; valid: number; flagged: number; removed: number }
}

export interface ICPMatchResult {
  lead: Lead
  score: number
  maxScore: number
  percentage: number
  matches: string[]
  misses: string[]
}

export interface LeadReport {
  total: number
  byIndustry: Record<string, number>
  byTitle: Record<string, number>
  byCompanySize: Record<string, number>
  byDomain: Record<string, number>
  bySource: Record<string, number>
  emailStats: {
    valid: number
    invalid: number
    disposable: number
    generic: number
  }
  completenessScore: number
  fieldCoverage: Record<string, { count: number; percentage: number }>
}

export interface ParsedCSVResult {
  leads: Lead[]
  headers: string[]
  columnMapping: Record<string, string>
  parseErrors: { row: number; error: string }[]
  stats: {
    totalRows: number
    successfulRows: number
    failedRows: number
  }
}

// =============================================================================
// Constants
// =============================================================================

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  'mailinator.com', 'throwaway.email', '10minutemail.com', 'fakeinbox.com',
  'trashmail.com', 'tempail.com', 'tempmailaddress.com', 'tmpmail.org',
  'getnada.com', 'mohmal.com', 'dispostable.com', 'mailnesia.com',
  'maildrop.cc', 'yopmail.com', 'sharklasers.com', 'spam4.me',
  'grr.la', 'guerrillamailblock.com', 'pokemail.net', 'getairmail.com',
  'discard.email', 'spamgourmet.com', 'mytrashmail.com', 'mailcatch.com',
  'trashmail.net', 'mailforspam.com', 'spambox.us', 'tempr.email',
  'fakemail.net', 'throwawaymail.com', 'mailsac.com', 'burnermail.io',
  'tempinbox.com', 'emailondeck.com', 'mintemail.com', 'tempmailo.com',
])

// Generic/role-based emails that are often low quality
const GENERIC_EMAIL_PREFIXES = new Set([
  'info', 'contact', 'hello', 'support', 'sales', 'admin', 'help',
  'office', 'team', 'service', 'enquiry', 'enquiries', 'marketing',
  'noreply', 'no-reply', 'donotreply', 'webmaster', 'postmaster',
  'hostmaster', 'abuse', 'spam', 'mail', 'email', 'general',
  'reception', 'billing', 'accounts', 'orders', 'jobs', 'careers',
  'hr', 'press', 'media', 'feedback', 'customerservice',
])

// Free email providers (not necessarily bad, but often B2C)
const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'protonmail.com', 'proton.me', 'zoho.com', 'mail.com', 'gmx.com',
  'yandex.com', 'fastmail.com', 'tutanota.com', 'hushmail.com',
])

// Column name mappings for CSV parsing
const COLUMN_MAPPINGS: Record<string, string[]> = {
  email: ['email', 'e-mail', 'email_address', 'emailaddress', 'work_email', 'workemail', 'business_email'],
  firstName: ['first_name', 'firstname', 'first', 'fname', 'given_name', 'givenname'],
  lastName: ['last_name', 'lastname', 'last', 'lname', 'surname', 'family_name', 'familyname'],
  company: ['company', 'company_name', 'companyname', 'organization', 'org', 'employer', 'business'],
  title: ['title', 'job_title', 'jobtitle', 'position', 'role', 'job_role', 'designation'],
  industry: ['industry', 'sector', 'vertical', 'business_type'],
  companySize: ['company_size', 'companysize', 'size', 'employees', 'employee_count', 'num_employees', 'headcount'],
  linkedinUrl: ['linkedin', 'linkedin_url', 'linkedinurl', 'linkedin_profile', 'li_url'],
  phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'telephone', 'work_phone'],
  website: ['website', 'url', 'company_website', 'domain', 'web'],
  location: ['location', 'city', 'country', 'region', 'address', 'state', 'geo'],
  source: ['source', 'lead_source', 'origin', 'campaign', 'list_name'],
}

// =============================================================================
// CSV Parsing
// =============================================================================

/**
 * Parse a CSV file and extract leads with automatic column detection
 */
export async function parseLeadCSV(file: File): Promise<ParsedCSVResult> {
  const text = await file.text()
  return parseLeadCSVString(text)
}

/**
 * Parse CSV string (useful for testing or server-side usage)
 */
export function parseLeadCSVString(csvText: string): ParsedCSVResult {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
  
  if (lines.length === 0) {
    return {
      leads: [],
      headers: [],
      columnMapping: {},
      parseErrors: [{ row: 0, error: 'Empty CSV file' }],
      stats: { totalRows: 0, successfulRows: 0, failedRows: 0 }
    }
  }

  // Parse headers
  const headers = parseCSVRow(lines[0])
  const columnMapping = detectColumnMapping(headers)
  
  const leads: Lead[] = []
  const parseErrors: { row: number; error: string }[] = []

  // Check if we have an email column
  if (!columnMapping.email) {
    parseErrors.push({ row: 0, error: 'No email column detected in CSV headers' })
    return {
      leads: [],
      headers,
      columnMapping,
      parseErrors,
      stats: { totalRows: lines.length - 1, successfulRows: 0, failedRows: lines.length - 1 }
    }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVRow(lines[i])
      
      if (values.length === 0) continue
      
      const lead = mapRowToLead(headers, values, columnMapping)
      
      if (!lead.email || lead.email.trim() === '') {
        parseErrors.push({ row: i + 1, error: 'Missing email' })
        continue
      }
      
      leads.push(lead)
    } catch (error) {
      parseErrors.push({ 
        row: i + 1, 
        error: error instanceof Error ? error.message : 'Unknown parse error' 
      })
    }
  }

  return {
    leads,
    headers,
    columnMapping,
    parseErrors,
    stats: {
      totalRows: lines.length - 1,
      successfulRows: leads.length,
      failedRows: parseErrors.length
    }
  }
}

/**
 * Parse a single CSV row, handling quoted values
 */
function parseCSVRow(row: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current.trim())
  return values
}

/**
 * Detect which CSV columns map to which Lead fields
 */
function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  
  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''))
      
      if (normalizedAliases.includes(normalizedHeader)) {
        mapping[field] = header
        break
      }
    }
  }
  
  return mapping
}

/**
 * Map a row of values to a Lead object
 */
function mapRowToLead(
  headers: string[], 
  values: string[], 
  columnMapping: Record<string, string>
): Lead {
  const lead: Lead = { email: '' }
  
  // Map known fields
  for (const [field, header] of Object.entries(columnMapping)) {
    const index = headers.indexOf(header)
    if (index !== -1 && values[index]) {
      (lead as any)[field] = values[index].trim()
    }
  }
  
  // Include unmapped fields as extra properties
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    const isMapped = Object.values(columnMapping).includes(header)
    
    if (!isMapped && values[i]) {
      lead[header] = values[i].trim()
    }
  }
  
  return lead
}

// =============================================================================
// Email Validation
// =============================================================================

/**
 * Validate emails in a list of leads
 */
export function validateEmails(leads: Lead[]): LeadValidationResult {
  const valid: Lead[] = []
  const flagged: { lead: Lead; reason: string }[] = []
  const removed: { lead: Lead; reason: string }[] = []

  for (const lead of leads) {
    const validation = validateSingleEmail(lead.email)
    
    if (validation.isValid) {
      if (validation.warnings.length > 0) {
        flagged.push({ lead, reason: validation.warnings.join('; ') })
      } else {
        valid.push(lead)
      }
    } else {
      removed.push({ lead, reason: validation.error || 'Invalid email' })
    }
  }

  return {
    valid,
    flagged,
    removed,
    stats: {
      total: leads.length,
      valid: valid.length,
      flagged: flagged.length,
      removed: removed.length
    }
  }
}

interface EmailValidationResult {
  isValid: boolean
  error?: string
  warnings: string[]
  domain?: string
  isDisposable: boolean
  isGeneric: boolean
  isFreeProvider: boolean
}

/**
 * Validate a single email address
 */
export function validateSingleEmail(email: string): EmailValidationResult {
  const result: EmailValidationResult = {
    isValid: true,
    warnings: [],
    isDisposable: false,
    isGeneric: false,
    isFreeProvider: false
  }

  if (!email || typeof email !== 'string') {
    return { ...result, isValid: false, error: 'Email is empty or invalid type' }
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return { ...result, isValid: false, error: 'Invalid email format' }
  }

  // More strict validation
  const strictRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!strictRegex.test(email)) {
    result.warnings.push('Email contains unusual characters')
  }

  // Extract parts
  const [localPart, domain] = trimmedEmail.split('@')
  result.domain = domain

  // Check for disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    result.isDisposable = true
    return { ...result, isValid: false, error: 'Disposable email domain' }
  }

  // Check for generic/role-based emails
  if (GENERIC_EMAIL_PREFIXES.has(localPart)) {
    result.isGeneric = true
    result.warnings.push('Generic/role-based email address')
  }

  // Check for free email providers
  if (FREE_EMAIL_PROVIDERS.has(domain)) {
    result.isFreeProvider = true
    result.warnings.push('Free email provider (possibly personal email)')
  }

  // Check for suspicious patterns
  if (/^[0-9]+$/.test(localPart)) {
    result.warnings.push('Email local part is all numbers')
  }

  if (localPart.length < 2) {
    result.warnings.push('Very short email local part')
  }

  if (localPart.includes('test') || localPart.includes('fake') || localPart.includes('demo')) {
    result.warnings.push('Possibly test/fake email')
  }

  return result
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string): string {
  const parts = email.toLowerCase().trim().split('@')
  return parts.length === 2 ? parts[1] : ''
}

// =============================================================================
// Competitor Detection
// =============================================================================

/**
 * Detect and flag leads from competitor domains
 */
export function detectCompetitors(
  leads: Lead[], 
  competitorDomains: string[]
): LeadValidationResult {
  const normalizedCompetitors = new Set(
    competitorDomains.map(d => d.toLowerCase().trim())
  )

  const valid: Lead[] = []
  const flagged: { lead: Lead; reason: string }[] = []
  const removed: { lead: Lead; reason: string }[] = []

  for (const lead of leads) {
    const domain = extractDomain(lead.email)
    
    if (normalizedCompetitors.has(domain)) {
      flagged.push({ 
        lead, 
        reason: `Competitor domain: ${domain}` 
      })
    } else {
      // Also check company name if provided
      const companyLower = lead.company?.toLowerCase() || ''
      const isCompetitorCompany = competitorDomains.some(d => {
        const companyName = d.replace(/\.(com|io|co|net|org)$/, '')
        return companyLower.includes(companyName)
      })
      
      if (isCompetitorCompany) {
        flagged.push({
          lead,
          reason: `Possible competitor company: ${lead.company}`
        })
      } else {
        valid.push(lead)
      }
    }
  }

  return {
    valid,
    flagged,
    removed,
    stats: {
      total: leads.length,
      valid: valid.length,
      flagged: flagged.length,
      removed: removed.length
    }
  }
}

// =============================================================================
// ICP Matching
// =============================================================================

/**
 * Match leads against ICP criteria and score them
 */
export function matchICP(
  leads: Lead[], 
  icpCriteria: ICPCriteria
): ICPMatchResult[] {
  return leads.map(lead => scoreLead(lead, icpCriteria))
}

/**
 * Score a single lead against ICP criteria
 */
function scoreLead(lead: Lead, icp: ICPCriteria): ICPMatchResult {
  let score = 0
  let maxScore = 0
  const matches: string[] = []
  const misses: string[] = []

  // Check titles (exact match)
  if (icp.titles && icp.titles.length > 0) {
    maxScore += 25
    const leadTitle = lead.title?.toLowerCase() || ''
    const titleMatch = icp.titles.some(t => 
      leadTitle.includes(t.toLowerCase())
    )
    if (titleMatch) {
      score += 25
      matches.push(`Title matches: ${lead.title}`)
    } else {
      misses.push(`Title doesn't match ICP: ${lead.title || 'missing'}`)
    }
  }

  // Check title keywords (partial match)
  if (icp.titleKeywords && icp.titleKeywords.length > 0) {
    maxScore += 15
    const leadTitle = lead.title?.toLowerCase() || ''
    const keywordMatch = icp.titleKeywords.some(k => 
      leadTitle.includes(k.toLowerCase())
    )
    if (keywordMatch) {
      score += 15
      matches.push(`Title contains ICP keyword`)
    } else {
      misses.push(`Title missing ICP keywords`)
    }
  }

  // Check excluded title keywords
  if (icp.excludeTitleKeywords && icp.excludeTitleKeywords.length > 0) {
    const leadTitle = lead.title?.toLowerCase() || ''
    const hasExcluded = icp.excludeTitleKeywords.some(k =>
      leadTitle.includes(k.toLowerCase())
    )
    if (hasExcluded) {
      score -= 50 // Heavy penalty
      misses.push(`Title contains excluded keyword`)
    }
  }

  // Check industries
  if (icp.industries && icp.industries.length > 0) {
    maxScore += 20
    const leadIndustry = lead.industry?.toLowerCase() || ''
    const industryMatch = icp.industries.some(i => 
      leadIndustry.includes(i.toLowerCase()) || 
      i.toLowerCase().includes(leadIndustry)
    )
    if (industryMatch) {
      score += 20
      matches.push(`Industry matches: ${lead.industry}`)
    } else {
      misses.push(`Industry doesn't match ICP: ${lead.industry || 'missing'}`)
    }
  }

  // Check company sizes
  if (icp.companySizes && icp.companySizes.length > 0) {
    maxScore += 20
    const leadSize = normalizeCompanySize(lead.companySize)
    const sizeMatch = icp.companySizes.some(s => 
      normalizeCompanySize(s) === leadSize
    )
    if (sizeMatch) {
      score += 20
      matches.push(`Company size matches: ${lead.companySize}`)
    } else {
      misses.push(`Company size doesn't match ICP: ${lead.companySize || 'missing'}`)
    }
  }

  // Check excluded domains
  if (icp.excludeDomains && icp.excludeDomains.length > 0) {
    const domain = extractDomain(lead.email)
    const isExcluded = icp.excludeDomains.some(d => 
      d.toLowerCase() === domain
    )
    if (isExcluded) {
      score -= 100 // Automatic disqualification
      misses.push(`Domain is excluded: ${domain}`)
    }
  }

  // Check required fields
  if (icp.requiredFields && icp.requiredFields.length > 0) {
    maxScore += 20
    const missingFields = icp.requiredFields.filter(f => 
      !lead[f] || lead[f].trim() === ''
    )
    if (missingFields.length === 0) {
      score += 20
      matches.push(`All required fields present`)
    } else {
      misses.push(`Missing required fields: ${missingFields.join(', ')}`)
    }
  }

  // Ensure minimum max score
  maxScore = Math.max(maxScore, 1)
  
  // Calculate percentage (handle negative scores)
  const percentage = Math.max(0, Math.round((score / maxScore) * 100))

  return {
    lead,
    score: Math.max(0, score),
    maxScore,
    percentage,
    matches,
    misses
  }
}

/**
 * Normalize company size to standard categories
 */
function normalizeCompanySize(size?: string): string {
  if (!size) return 'unknown'
  
  const normalized = size.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  // Check for number ranges
  const numMatch = size.match(/(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    if (num <= 10) return 'micro'
    if (num <= 50) return 'small'
    if (num <= 200) return 'medium'
    if (num <= 1000) return 'large'
    return 'enterprise'
  }

  // Check for text descriptions
  if (normalized.includes('micro') || normalized.includes('startup')) return 'micro'
  if (normalized.includes('small') || normalized.includes('smb')) return 'small'
  if (normalized.includes('mid') || normalized.includes('medium')) return 'medium'
  if (normalized.includes('large')) return 'large'
  if (normalized.includes('enterprise') || normalized.includes('fortune')) return 'enterprise'

  return 'unknown'
}

/**
 * Filter leads by ICP score threshold
 */
export function filterByICPScore(
  results: ICPMatchResult[], 
  minPercentage: number = 50
): { passing: ICPMatchResult[]; failing: ICPMatchResult[] } {
  const passing = results.filter(r => r.percentage >= minPercentage)
  const failing = results.filter(r => r.percentage < minPercentage)
  return { passing, failing }
}

// =============================================================================
// Deduplication
// =============================================================================

/**
 * Remove duplicate leads by email
 */
export function deduplicateLeads(leads: Lead[]): {
  unique: Lead[]
  duplicates: { lead: Lead; duplicateOf: string }[]
} {
  const seen = new Map<string, Lead>()
  const unique: Lead[] = []
  const duplicates: { lead: Lead; duplicateOf: string }[] = []

  for (const lead of leads) {
    const email = lead.email.toLowerCase().trim()
    
    if (seen.has(email)) {
      duplicates.push({ 
        lead, 
        duplicateOf: seen.get(email)!.email 
      })
    } else {
      seen.set(email, lead)
      unique.push(lead)
    }
  }

  return { unique, duplicates }
}

/**
 * Advanced deduplication with fuzzy matching on name + company
 */
export function deduplicateLeadsAdvanced(leads: Lead[]): {
  unique: Lead[]
  duplicates: { lead: Lead; duplicateOf: string; matchType: string }[]
} {
  const unique: Lead[] = []
  const duplicates: { lead: Lead; duplicateOf: string; matchType: string }[] = []
  
  const emailIndex = new Map<string, Lead>()
  const nameCompanyIndex = new Map<string, Lead>()

  for (const lead of leads) {
    const email = lead.email.toLowerCase().trim()
    
    // Check exact email match
    if (emailIndex.has(email)) {
      duplicates.push({
        lead,
        duplicateOf: emailIndex.get(email)!.email,
        matchType: 'exact_email'
      })
      continue
    }

    // Check name + company combination
    if (lead.firstName && lead.lastName && lead.company) {
      const nameCompanyKey = `${lead.firstName.toLowerCase()}_${lead.lastName.toLowerCase()}_${lead.company.toLowerCase()}`.replace(/\s+/g, '')
      
      if (nameCompanyIndex.has(nameCompanyKey)) {
        duplicates.push({
          lead,
          duplicateOf: nameCompanyIndex.get(nameCompanyKey)!.email,
          matchType: 'name_company'
        })
        continue
      }
      
      nameCompanyIndex.set(nameCompanyKey, lead)
    }

    emailIndex.set(email, lead)
    unique.push(lead)
  }

  return { unique, duplicates }
}

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate comprehensive statistics report for a lead list
 */
export function generateLeadReport(leads: Lead[]): LeadReport {
  const byIndustry: Record<string, number> = {}
  const byTitle: Record<string, number> = {}
  const byCompanySize: Record<string, number> = {}
  const byDomain: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  
  const emailStats = {
    valid: 0,
    invalid: 0,
    disposable: 0,
    generic: 0
  }

  const fieldCounts: Record<string, number> = {}
  const fields = ['email', 'firstName', 'lastName', 'company', 'title', 'industry', 'companySize', 'linkedinUrl', 'phone', 'website', 'location']

  for (const lead of leads) {
    // Count by industry
    const industry = lead.industry || 'Unknown'
    byIndustry[industry] = (byIndustry[industry] || 0) + 1

    // Count by title (normalize common variations)
    const title = normalizeTitle(lead.title) || 'Unknown'
    byTitle[title] = (byTitle[title] || 0) + 1

    // Count by company size
    const size = lead.companySize || 'Unknown'
    byCompanySize[size] = (byCompanySize[size] || 0) + 1

    // Count by domain
    const domain = extractDomain(lead.email) || 'Unknown'
    byDomain[domain] = (byDomain[domain] || 0) + 1

    // Count by source
    const source = lead.source || 'Unknown'
    bySource[source] = (bySource[source] || 0) + 1

    // Validate email
    const emailValidation = validateSingleEmail(lead.email)
    if (emailValidation.isValid) {
      emailStats.valid++
      if (emailValidation.isGeneric) emailStats.generic++
    } else {
      emailStats.invalid++
      if (emailValidation.isDisposable) emailStats.disposable++
    }

    // Count field coverage
    for (const field of fields) {
      if (lead[field] && String(lead[field]).trim() !== '') {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1
      }
    }
  }

  // Calculate field coverage percentages
  const fieldCoverage: Record<string, { count: number; percentage: number }> = {}
  for (const field of fields) {
    const count = fieldCounts[field] || 0
    fieldCoverage[field] = {
      count,
      percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0
    }
  }

  // Calculate completeness score (average field coverage)
  const avgCoverage = Object.values(fieldCoverage).reduce((sum, f) => sum + f.percentage, 0) / fields.length

  return {
    total: leads.length,
    byIndustry: sortByValue(byIndustry),
    byTitle: sortByValue(byTitle),
    byCompanySize: sortByValue(byCompanySize),
    byDomain: sortByValue(byDomain, 20), // Top 20 domains
    bySource: sortByValue(bySource),
    emailStats,
    completenessScore: Math.round(avgCoverage),
    fieldCoverage
  }
}

/**
 * Normalize job titles for better grouping
 */
function normalizeTitle(title?: string): string {
  if (!title) return ''
  
  const normalized = title.toLowerCase().trim()
  
  // Map common variations
  const mappings: Record<string, string> = {
    'ceo': 'CEO',
    'chief executive officer': 'CEO',
    'cfo': 'CFO',
    'chief financial officer': 'CFO',
    'cto': 'CTO',
    'chief technology officer': 'CTO',
    'cmo': 'CMO',
    'chief marketing officer': 'CMO',
    'coo': 'COO',
    'chief operating officer': 'COO',
    'vp': 'VP',
    'vice president': 'VP',
    'svp': 'SVP',
    'senior vice president': 'SVP',
    'evp': 'EVP',
    'executive vice president': 'EVP',
  }

  for (const [pattern, replacement] of Object.entries(mappings)) {
    if (normalized.includes(pattern)) {
      // Return title with normalized prefix
      return title.replace(new RegExp(pattern, 'i'), replacement)
    }
  }

  return title
}

/**
 * Sort object by values (descending) and optionally limit
 */
function sortByValue(obj: Record<string, number>, limit?: number): Record<string, number> {
  const sorted = Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
  
  return Object.fromEntries(sorted)
}

// =============================================================================
// Comprehensive Validation Pipeline
// =============================================================================

/**
 * Run full validation pipeline on leads
 */
export function validateLeadList(
  leads: Lead[],
  options: {
    competitorDomains?: string[]
    icpCriteria?: ICPCriteria
    deduplicate?: boolean
    minICPScore?: number
  } = {}
): {
  results: LeadValidationResult
  icpResults?: ICPMatchResult[]
  report: LeadReport
  deduplication?: ReturnType<typeof deduplicateLeads>
} {
  let processedLeads = [...leads]
  const allFlagged: { lead: Lead; reason: string }[] = []
  const allRemoved: { lead: Lead; reason: string }[] = []
  let deduplication: ReturnType<typeof deduplicateLeads> | undefined

  // Step 1: Deduplicate
  if (options.deduplicate !== false) {
    deduplication = deduplicateLeads(processedLeads)
    processedLeads = deduplication.unique
    for (const dup of deduplication.duplicates) {
      allRemoved.push({ lead: dup.lead, reason: `Duplicate of ${dup.duplicateOf}` })
    }
  }

  // Step 2: Validate emails
  const emailValidation = validateEmails(processedLeads)
  processedLeads = emailValidation.valid
  allFlagged.push(...emailValidation.flagged)
  allRemoved.push(...emailValidation.removed)

  // Step 3: Detect competitors
  if (options.competitorDomains && options.competitorDomains.length > 0) {
    const competitorCheck = detectCompetitors(processedLeads, options.competitorDomains)
    processedLeads = competitorCheck.valid
    allFlagged.push(...competitorCheck.flagged)
  }

  // Step 4: Match ICP
  let icpResults: ICPMatchResult[] | undefined
  if (options.icpCriteria) {
    icpResults = matchICP(processedLeads, options.icpCriteria)
    
    if (options.minICPScore !== undefined) {
      const { passing, failing } = filterByICPScore(icpResults, options.minICPScore)
      processedLeads = passing.map(r => r.lead)
      
      for (const fail of failing) {
        allFlagged.push({
          lead: fail.lead,
          reason: `ICP score too low: ${fail.percentage}% (min: ${options.minICPScore}%)`
        })
      }
      
      // Update ICP results to only include passing
      icpResults = passing
    }
  }

  // Generate report
  const report = generateLeadReport(leads)

  return {
    results: {
      valid: processedLeads,
      flagged: allFlagged,
      removed: allRemoved,
      stats: {
        total: leads.length,
        valid: processedLeads.length,
        flagged: allFlagged.length,
        removed: allRemoved.length
      }
    },
    icpResults,
    report,
    deduplication
  }
}

// =============================================================================
// Export utilities
// =============================================================================

/**
 * Convert leads to CSV string for export
 */
export function leadsToCSV(leads: Lead[], columns?: string[]): string {
  if (leads.length === 0) return ''
  
  // Determine columns
  const cols = columns || Object.keys(leads[0]).filter(k => k !== '[key: string]')
  
  // Header row
  const rows = [cols.join(',')]
  
  // Data rows
  for (const lead of leads) {
    const values = cols.map(col => {
      const value = lead[col]
      if (value === undefined || value === null) return ''
      const str = String(value)
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    rows.push(values.join(','))
  }
  
  return rows.join('\n')
}

/**
 * Export validation results to a summary object
 */
export function exportValidationSummary(
  results: ReturnType<typeof validateLeadList>
): Record<string, any> {
  return {
    summary: {
      totalInput: results.results.stats.total,
      validLeads: results.results.stats.valid,
      flaggedLeads: results.results.stats.flagged,
      removedLeads: results.results.stats.removed,
      passRate: Math.round((results.results.stats.valid / results.results.stats.total) * 100) + '%'
    },
    report: {
      completenessScore: results.report.completenessScore + '%',
      topIndustries: Object.entries(results.report.byIndustry).slice(0, 5),
      topTitles: Object.entries(results.report.byTitle).slice(0, 5),
      emailQuality: results.report.emailStats
    },
    flagReasons: groupByReason(results.results.flagged),
    removalReasons: groupByReason(results.results.removed)
  }
}

function groupByReason(items: { lead: Lead; reason: string }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    counts[item.reason] = (counts[item.reason] || 0) + 1
  }
  return sortByValue(counts)
}
