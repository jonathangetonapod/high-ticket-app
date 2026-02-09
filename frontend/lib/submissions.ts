// Submission data model and storage utilities
// Now using Supabase

import { createServerClient } from './supabase/server'

export interface SubmissionCampaign {
  campaignId: string
  campaignName: string
  leadCount: number
}

export interface ValidationIssue {
  type: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationScore {
  score: number
  issues: ValidationIssue[]
}

export interface Submission {
  id: string
  clientId: string
  clientName: string
  platform: 'bison' | 'instantly'
  campaigns: SubmissionCampaign[]
  validationResults: {
    emailCopy: ValidationScore
    leadList: ValidationScore
    mailboxHealth: ValidationScore
  }
  strategistNotes: string
  status: 'pending' | 'approved' | 'rejected' | 'launched'
  submittedBy: string
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
}

// Transform database row to Submission interface
function rowToSubmission(row: any): Submission {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    platform: row.platform,
    campaigns: row.campaigns || [],
    validationResults: row.validation_results || {
      emailCopy: { score: 0, issues: [] },
      leadList: { score: 0, issues: [] },
      mailboxHealth: { score: 0, issues: [] },
    },
    strategistNotes: row.strategist_notes || '',
    status: row.status,
    submittedBy: row.submitted_by || '',
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
  }
}

// Transform Submission to database row
function submissionToRow(submission: Partial<Submission> & { id: string }) {
  return {
    id: submission.id,
    client_id: submission.clientId,
    client_name: submission.clientName,
    platform: submission.platform,
    campaigns: submission.campaigns,
    validation_results: submission.validationResults,
    strategist_notes: submission.strategistNotes,
    status: submission.status,
    submitted_by: submission.submittedBy,
    submitted_at: submission.submittedAt,
    reviewed_by: submission.reviewedBy,
    reviewed_at: submission.reviewedAt,
    review_notes: submission.reviewNotes,
    updated_at: new Date().toISOString(),
  }
}

export function generateSubmissionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `SUB-${timestamp}-${random}`.toUpperCase()
}

export async function createSubmission(data: Omit<Submission, 'id' | 'status' | 'submittedAt'>): Promise<Submission> {
  const supabase = createServerClient()
  
  const submission: Submission = {
    ...data,
    id: generateSubmissionId(),
    status: 'pending',
    submittedAt: new Date().toISOString()
  }
  
  const row = submissionToRow(submission)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('submissions') as any)
    .insert(row)
  
  if (error) {
    console.error('Error creating submission:', error)
    throw new Error('Failed to create submission')
  }
  
  return submission
}

export async function getSubmissions(filters?: {
  status?: Submission['status']
  clientId?: string
  platform?: 'bison' | 'instantly'
}): Promise<Submission[]> {
  const supabase = createServerClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase
    .from('submissions') as any)
    .select('*')
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  if (filters?.platform) {
    query = query.eq('platform', filters.platform)
  }
  
  const { data, error } = await query.order('submitted_at', { ascending: false })
  
  if (error) {
    console.error('Error loading submissions:', error)
    return []
  }
  
  return (data || []).map(rowToSubmission)
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const supabase = createServerClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('submissions') as any)
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return rowToSubmission(data)
}

export async function updateSubmission(
  id: string, 
  updates: Partial<Pick<Submission, 'status' | 'reviewedBy' | 'reviewedAt' | 'reviewNotes'>>
): Promise<Submission | null> {
  const supabase = createServerClient()
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  }
  
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.reviewedBy !== undefined) updateData.reviewed_by = updates.reviewedBy
  if (updates.reviewedAt !== undefined) updateData.reviewed_at = updates.reviewedAt
  if (updates.reviewNotes !== undefined) updateData.review_notes = updates.reviewNotes
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('submissions') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error || !data) {
    console.error('Error updating submission:', error)
    return null
  }
  
  return rowToSubmission(data)
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const supabase = createServerClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('submissions') as any)
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting submission:', error)
    return false
  }
  
  return true
}
