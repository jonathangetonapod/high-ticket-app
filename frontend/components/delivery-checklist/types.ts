// Shared types for delivery checklist components

export type ValidationStatus = 'idle' | 'validating' | 'pass' | 'fail' | 'warning'

// Inline AI Suggestion types
export interface InlineSuggestionLocation {
  emailIndex: number
  field: 'subject' | 'body'
  campaignId?: string
}

export interface InlineSuggestionItem {
  id: string
  type: 'subject' | 'body' | 'personalization' | 'tone' | 'length' | 'spam'
  severity: 'error' | 'warning' | 'suggestion'
  message: string
  original: string
  suggested: string
  location: InlineSuggestionLocation
  applied?: boolean
  dismissed?: boolean
}

export interface InlineSuggestionsState {
  [campaignId: string]: {
    [emailIndex: number]: InlineSuggestionItem[]
  }
}

export interface ValidationResult {
  status: ValidationStatus
  message: string
  details?: string[]
}

export interface Client {
  id: string
  name: string
  platform: string
  workspaceId: string
}

export interface Campaign {
  id: string
  name: string
  status?: string
}

export interface CampaignSequence {
  step: number
  subject: string
  body: string
  wait_days?: number
  delay_hours?: number
  thread_reply?: boolean
  variant?: boolean
  variants?: Array<{ subject: string; body: string }>
}

export interface CampaignDetails {
  campaign_id: string
  campaign_name: string
  platform: string
  status?: string
  sequences: CampaignSequence[]
}

export interface MailboxAccount {
  id: string
  email: string
  name: string
  created_at?: string
  warmup_score?: number
  warmup_emails_sent?: number
  warmup_bounces_caused_count?: number
  warmup_replies_received?: number
  warmup_disabled_for_bouncing_count?: number
}

export interface MailboxHealthSummary {
  total: number
  healthy: number
  warning: number
  critical: number
  avg_warmup_score: number
}

export interface MailboxData {
  accounts: MailboxAccount[]
  health_summary: MailboxHealthSummary
}

export interface LeadListData {
  file: File | null
  leadCount: number
  sampleLeads: Array<Record<string, any>>
  validated: boolean
  issues: string[]
}

export interface CampaignLeadListData {
  [campaignId: string]: LeadListData | null
}

export interface SlackChannel {
  id: string
  name: string
  member_count: number
}

export interface SlackMessage {
  ts: string
  text: string
  user?: string
  type: string
}

export interface FormData {
  clientId: string
  clientName: string
  fathomMeetingId: string
  strategyTranscript: string
  intakeFormUrl: string
  platform: string
  workspaceId: string
  campaignId: string
  leadCount: string
  leadListUrl: string
  loomUrl: string
  loomTranscript: string
  selectedThreadId: string
  threadMessages: any[]
  selectedSlackChannel: string
  slackMessages: any[]
  strategistNotes: string
}

// Utility functions

export function htmlToText(html: string): string {
  if (!html) return ''
  if (typeof document === 'undefined') return html

  const temp = document.createElement('div')
  temp.innerHTML = html

  let text = temp.textContent || temp.innerText || ''
  text = text.replace(/\n\s*\n/g, '\n\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.trim()

  return text
}

export function parseSpintax(text: string): { hasSpintax: boolean; variants: string[] } {
  const spintaxPattern = /\{([^}]+)\}/g
  const matches = text.match(spintaxPattern)

  if (!matches) {
    return { hasSpintax: false, variants: [] }
  }

  const allVariants: string[][] = []
  matches.forEach(match => {
    const content = match.slice(1, -1)
    if (content.includes('|')) {
      const options = content.split('|')
      allVariants.push(options)
    }
  })

  if (allVariants.length === 0) {
    return { hasSpintax: false, variants: [] }
  }

  return {
    hasSpintax: true,
    variants: allVariants.flat()
  }
}

export function getStatusBadge(status: string | number): { color: string; label: string; icon: string } {
  let statusStr = typeof status === 'number'
    ? ['draft', 'active', 'paused', 'completed', 'archived'][status] || 'unknown'
    : status.toLowerCase()

  const statusMap: Record<string, { color: string; label: string; icon: string }> = {
    active: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Active', icon: '🟢' },
    completed: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Completed', icon: '🟡' },
    archived: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Archived', icon: '⚪' },
    paused: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Paused', icon: '🟠' },
    draft: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Draft', icon: '🟣' },
    unknown: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Unknown', icon: '⚫' },
  }

  return statusMap[statusStr] || { color: 'bg-gray-100 text-gray-600 border-gray-200', label: String(status), icon: '⚫' }
}
