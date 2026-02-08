import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse'
import { Readable } from 'stream'
import {
  Lead,
  validateSingleEmail,
  extractDomain,
} from '@/lib/lead-validation'

// =============================================================================
// Types
// =============================================================================

interface FieldCoverage {
  email: { count: number; percentage: number }
  firstName: { count: number; percentage: number }
  lastName: { count: number; percentage: number }
  company: { count: number; percentage: number }
  title: { count: number; percentage: number }
  industry: { count: number; percentage: number }
  companySize: { count: number; percentage: number }
  linkedinUrl: { count: number; percentage: number }
}

interface ProcessingResult {
  success: true
  campaignId: string
  processingTimeMs: number
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicates: number
  }
  fieldCoverage: FieldCoverage
  distributions: {
    titles: Record<string, number>
    industries: Record<string, number>
    companySizes: Record<string, number>
    domains: Record<string, number>
  }
  issues: {
    invalidEmails: string[]
    disposableEmails: string[]
    genericEmails: string[]
    missingRequired: number
    duplicateEmails: string[]
  }
  sampleRows: Lead[]
}

interface ProcessingError {
  success: false
  error: string
  details?: string
}

// =============================================================================
// Constants
// =============================================================================

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
// Helper Functions
// =============================================================================

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
 * Map a record to a Lead object using column mapping
 */
function mapRecordToLead(
  record: Record<string, string>,
  columnMapping: Record<string, string>
): Lead {
  const lead: Lead = { email: '' }
  
  // Map known fields
  for (const [field, csvColumn] of Object.entries(columnMapping)) {
    if (record[csvColumn] !== undefined && record[csvColumn] !== '') {
      (lead as any)[field] = record[csvColumn].trim()
    }
  }
  
  // Include unmapped fields as extra properties
  const mappedColumns = new Set(Object.values(columnMapping))
  for (const [key, value] of Object.entries(record)) {
    if (!mappedColumns.has(key) && value) {
      lead[key] = value.trim()
    }
  }
  
  return lead
}

/**
 * Sort object by values (descending) and return top N
 */
function getTopN(obj: Record<string, number>, n: number = 10): Record<string, number> {
  return Object.fromEntries(
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
  )
}

// =============================================================================
// Main Processing Function
// =============================================================================

async function processCSVStream(
  buffer: Buffer,
  campaignId: string
): Promise<ProcessingResult> {
  const startTime = Date.now()
  
  // Stats counters
  let totalRows = 0
  let validRows = 0
  let invalidRows = 0
  
  // Field coverage counters
  const fieldCounts = {
    email: 0,
    firstName: 0,
    lastName: 0,
    company: 0,
    title: 0,
    industry: 0,
    companySize: 0,
    linkedinUrl: 0,
  }
  
  // Distribution counters
  const titleCounts: Record<string, number> = {}
  const industryCounts: Record<string, number> = {}
  const companySizeCounts: Record<string, number> = {}
  const domainCounts: Record<string, number> = {}
  
  // Issue arrays (capped at 100 each)
  const MAX_ISSUE_EXAMPLES = 100
  const invalidEmails: string[] = []
  const disposableEmails: string[] = []
  const genericEmails: string[] = []
  let missingRequired = 0
  
  // Deduplication
  const seenEmails = new Set<string>()
  const duplicateEmails: string[] = []
  
  // Results
  const validLeads: Lead[] = []
  const sampleRows: Lead[] = []
  
  // Column mapping (will be set after first record)
  let columnMapping: Record<string, string> = {}
  let headersDetected = false
  
  // Create parser with streaming
  const parser = Readable.from(buffer).pipe(parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_records_with_error: true,
    bom: true, // Handle BOM character in UTF-8 files
  }))
  
  // Process each record
  for await (const record of parser) {
    totalRows++
    
    // Detect column mapping on first record
    if (!headersDetected) {
      const headers = Object.keys(record)
      columnMapping = detectColumnMapping(headers)
      headersDetected = true
      
      // Check if we have an email column
      if (!columnMapping.email) {
        throw new Error('No email column detected in CSV. Expected headers like: email, e-mail, email_address')
      }
    }
    
    // Map record to lead
    const lead = mapRecordToLead(record, columnMapping)
    
    // Check for missing email (required field)
    if (!lead.email || lead.email.trim() === '') {
      missingRequired++
      invalidRows++
      continue
    }
    
    // Normalize email for deduplication
    const normalizedEmail = lead.email.toLowerCase().trim()
    
    // Check for duplicates
    if (seenEmails.has(normalizedEmail)) {
      if (duplicateEmails.length < 100) {
        duplicateEmails.push(normalizedEmail)
      }
      invalidRows++
      continue
    }
    seenEmails.add(normalizedEmail)
    
    // Validate email
    const emailValidation = validateSingleEmail(lead.email)
    
    if (!emailValidation.isValid) {
      if (emailValidation.isDisposable) {
        if (disposableEmails.length < MAX_ISSUE_EXAMPLES) {
          disposableEmails.push(lead.email)
        }
      } else {
        if (invalidEmails.length < MAX_ISSUE_EXAMPLES) {
          invalidEmails.push(lead.email)
        }
      }
      invalidRows++
      continue
    }
    
    // Track generic emails (but still count as valid)
    if (emailValidation.isGeneric) {
      if (genericEmails.length < MAX_ISSUE_EXAMPLES) {
        genericEmails.push(lead.email)
      }
    }
    
    // Valid lead - update counters
    validRows++
    
    // Update field coverage
    if (lead.email) fieldCounts.email++
    if (lead.firstName) fieldCounts.firstName++
    if (lead.lastName) fieldCounts.lastName++
    if (lead.company) fieldCounts.company++
    if (lead.title) fieldCounts.title++
    if (lead.industry) fieldCounts.industry++
    if (lead.companySize) fieldCounts.companySize++
    if (lead.linkedinUrl) fieldCounts.linkedinUrl++
    
    // Update distributions
    if (lead.title) {
      const title = lead.title.trim()
      titleCounts[title] = (titleCounts[title] || 0) + 1
    }
    
    if (lead.industry) {
      const industry = lead.industry.trim()
      industryCounts[industry] = (industryCounts[industry] || 0) + 1
    }
    
    if (lead.companySize) {
      const normalizedSize = normalizeCompanySize(lead.companySize)
      companySizeCounts[normalizedSize] = (companySizeCounts[normalizedSize] || 0) + 1
    }
    
    const domain = extractDomain(lead.email)
    if (domain) {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1
    }
    
    // Collect sample rows (first 10)
    if (sampleRows.length < 10) {
      sampleRows.push(lead)
    }
    
    // Add to valid leads
    validLeads.push(lead)
  }
  
  const processingTimeMs = Date.now() - startTime
  
  // Calculate field coverage percentages
  const fieldCoverage: FieldCoverage = {
    email: {
      count: fieldCounts.email,
      percentage: validRows > 0 ? Math.round((fieldCounts.email / validRows) * 100) : 0
    },
    firstName: {
      count: fieldCounts.firstName,
      percentage: validRows > 0 ? Math.round((fieldCounts.firstName / validRows) * 100) : 0
    },
    lastName: {
      count: fieldCounts.lastName,
      percentage: validRows > 0 ? Math.round((fieldCounts.lastName / validRows) * 100) : 0
    },
    company: {
      count: fieldCounts.company,
      percentage: validRows > 0 ? Math.round((fieldCounts.company / validRows) * 100) : 0
    },
    title: {
      count: fieldCounts.title,
      percentage: validRows > 0 ? Math.round((fieldCounts.title / validRows) * 100) : 0
    },
    industry: {
      count: fieldCounts.industry,
      percentage: validRows > 0 ? Math.round((fieldCounts.industry / validRows) * 100) : 0
    },
    companySize: {
      count: fieldCounts.companySize,
      percentage: validRows > 0 ? Math.round((fieldCounts.companySize / validRows) * 100) : 0
    },
    linkedinUrl: {
      count: fieldCounts.linkedinUrl,
      percentage: validRows > 0 ? Math.round((fieldCounts.linkedinUrl / validRows) * 100) : 0
    },
  }
  
  return {
    success: true,
    campaignId,
    processingTimeMs,
    stats: {
      totalRows,
      validRows,
      invalidRows,
      duplicates: duplicateEmails.length
    },
    fieldCoverage,
    distributions: {
      titles: getTopN(titleCounts),
      industries: getTopN(industryCounts),
      companySizes: getTopN(companySizeCounts),
      domains: getTopN(domainCounts)
    },
    issues: {
      invalidEmails,
      disposableEmails,
      genericEmails,
      missingRequired,
      duplicateEmails
    },
    sampleRows
  }
}

// =============================================================================
// API Route Handler
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ProcessingResult | ProcessingError>> {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    
    const file = formData.get('file') as File | null
    const campaignId = formData.get('campaignId') as string | null
    
    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'No campaignId provided' },
        { status: 400 }
      )
    }
    
    // Check file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'File must be a CSV file' },
        { status: 400 }
      )
    }
    
    // Check file size (limit to 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      )
    }
    
    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Check if file is empty
    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty' },
        { status: 400 }
      )
    }
    
    // Process CSV with streaming
    const result = await processCSVStream(buffer, campaignId)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error processing CSV:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      // CSV parsing errors
      if (error.message.includes('No email column')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid CSV format',
            details: error.message 
          },
          { status: 400 }
        )
      }
      
      // Generic parse errors
      if (error.message.includes('Parse Error') || error.message.includes('Invalid')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to parse CSV file',
            details: 'The file may be malformed or use an unsupported encoding. Try saving as UTF-8.'
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Processing failed',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// NOTE: In Next.js App Router, body parsing is handled by request.formData()
// No additional config needed - the deprecated `config` export was removed
