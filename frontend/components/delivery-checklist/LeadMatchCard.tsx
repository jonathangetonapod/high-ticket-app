'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Briefcase,
  Mail,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

// Types for ICP match analysis
export interface ICPMatchReason {
  factor: string
  positive: boolean
  weight?: number // Optional weight for scoring
}

export interface LeadAnalysis {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  title?: string
  industry?: string
  matchScore: number
  matchLevel: 'strong' | 'partial' | 'weak' | 'mismatch'
  reasons: ICPMatchReason[]
}

export interface ICPMatchSummary {
  strong: number
  partial: number
  weak: number
  mismatch: number
  total: number
  averageScore: number
}

// Helper: Get match level color
function getMatchLevelColor(level: LeadAnalysis['matchLevel']) {
  switch (level) {
    case 'strong':
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        ring: 'ring-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200'
      }
    case 'partial':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        ring: 'ring-amber-200',
        badge: 'bg-amber-100 text-amber-700 border-amber-200'
      }
    case 'weak':
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-700',
        ring: 'ring-orange-200',
        badge: 'bg-orange-100 text-orange-700 border-orange-200'
      }
    case 'mismatch':
      return {
        bg: 'bg-red-500',
        text: 'text-red-700',
        ring: 'ring-red-200',
        badge: 'bg-red-100 text-red-700 border-red-200'
      }
  }
}

// Helper: Get match level label
function getMatchLevelLabel(level: LeadAnalysis['matchLevel']) {
  switch (level) {
    case 'strong':
      return 'Strong Match'
    case 'partial':
      return 'Partial Match'
    case 'weak':
      return 'Weak Match'
    case 'mismatch':
      return 'Mismatch'
  }
}

// Circular Score Badge Component
function CircularScoreBadge({
  score,
  matchLevel,
  size = 'md'
}: {
  score: number
  matchLevel: LeadAnalysis['matchLevel']
  size?: 'sm' | 'md' | 'lg'
}) {
  const colors = getMatchLevelColor(matchLevel)
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-20 text-lg'
  }
  
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5
  const radius = size === 'sm' ? 16 : size === 'md' ? 22 : 32
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const viewBox = size === 'sm' ? '0 0 40 40' : size === 'md' ? '0 0 56 56' : '0 0 80 80'
  const center = size === 'sm' ? 20 : size === 'md' ? 28 : 40

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox={viewBox}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={colors.text}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <span className={`font-bold ${colors.text}`}>{score}</span>
    </div>
  )
}

// Single Lead Match Card
export function LeadMatchCard({
  lead,
  defaultExpanded = false
}: {
  lead: LeadAnalysis
  defaultExpanded?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)
  const colors = getMatchLevelColor(lead.matchLevel)
  
  const positiveReasons = lead.reasons.filter(r => r.positive)
  const negativeReasons = lead.reasons.filter(r => !r.positive)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border transition-all hover:shadow-md ${isOpen ? 'ring-2 ' + colors.ring : ''}`}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer">
            <div className="flex items-center gap-4">
              {/* Score Badge */}
              <CircularScoreBadge score={lead.matchScore} matchLevel={lead.matchLevel} />
              
              {/* Lead Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{lead.email}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {lead.title && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} />
                      {lead.title}
                    </span>
                  )}
                  {lead.company && (
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      {lead.company}
                    </span>
                  )}
                  {lead.industry && (
                    <span className="text-gray-400">• {lead.industry}</span>
                  )}
                </div>
              </div>

              {/* Match Level Badge & Chevron */}
              <div className="flex items-center gap-3">
                <Badge className={`${colors.badge} border text-xs`}>
                  {getMatchLevelLabel(lead.matchLevel)}
                </Badge>
                {isOpen ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Positive Reasons */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Match Factors ({positiveReasons.length})
                </h4>
                {positiveReasons.length > 0 ? (
                  <ul className="space-y-1.5">
                    {positiveReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{reason.factor}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">No matching factors</p>
                )}
              </div>

              {/* Negative Reasons */}
              <div>
                <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <XCircle size={14} />
                  Issues ({negativeReasons.length})
                </h4>
                {negativeReasons.length > 0 ? (
                  <ul className="space-y-1.5">
                    {negativeReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{reason.factor}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">No issues found</p>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ICP Match Summary Card
export function ICPMatchSummaryCard({
  summary,
  compact = false
}: {
  summary: ICPMatchSummary
  compact?: boolean
}) {
  const segments = [
    { label: 'Strong', count: summary.strong, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { label: 'Partial', count: summary.partial, color: 'bg-amber-500', textColor: 'text-amber-700' },
    { label: 'Weak', count: summary.weak, color: 'bg-orange-500', textColor: 'text-orange-700' },
    { label: 'Mismatch', count: summary.mismatch, color: 'bg-red-500', textColor: 'text-red-700' }
  ]

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {segments.map(seg => (
          seg.count > 0 && (
            <span key={seg.label} className={`flex items-center gap-1 ${seg.textColor}`}>
              <span className={`w-2 h-2 rounded-full ${seg.color}`} />
              {seg.count} {seg.label.toLowerCase()}
            </span>
          )
        ))}
      </div>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">ICP Match Overview</h3>
            <p className="text-xs text-muted-foreground">{summary.total} leads analyzed</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{Math.round(summary.averageScore)}%</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex bg-gray-100 mb-3">
          {segments.map(seg => {
            const width = summary.total > 0 ? (seg.count / summary.total) * 100 : 0
            return width > 0 ? (
              <div
                key={seg.label}
                className={`${seg.color} transition-all`}
                style={{ width: `${width}%` }}
                title={`${seg.label}: ${seg.count} (${Math.round(width)}%)`}
              />
            ) : null
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-4 gap-2">
          {segments.map(seg => (
            <div key={seg.label} className="text-center">
              <p className={`text-lg font-bold ${seg.textColor}`}>{seg.count}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{seg.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Filter Bar Component
export function ICPMatchFilter({
  currentFilter,
  onFilterChange,
  summary
}: {
  currentFilter: 'all' | 'strong' | 'partial' | 'weak' | 'mismatch'
  onFilterChange: (filter: 'all' | 'strong' | 'partial' | 'weak' | 'mismatch') => void
  summary: ICPMatchSummary
}) {
  const filters = [
    { value: 'all' as const, label: 'All', count: summary.total },
    { value: 'mismatch' as const, label: 'Mismatches', count: summary.mismatch, color: 'text-red-600' },
    { value: 'weak' as const, label: 'Weak', count: summary.weak, color: 'text-orange-600' },
    { value: 'partial' as const, label: 'Partial', count: summary.partial, color: 'text-amber-600' },
    { value: 'strong' as const, label: 'Strong', count: summary.strong, color: 'text-emerald-600' }
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${currentFilter === filter.value
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          {filter.label}
          {filter.count > 0 && (
            <span className={`ml-1.5 ${currentFilter === filter.value ? 'text-gray-300' : filter.color || 'text-gray-400'}`}>
              ({filter.count})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// Main ICP Match Analysis Section
export function ICPMatchAnalysis({
  leads,
  isLoading = false,
  error = null
}: {
  leads: LeadAnalysis[]
  isLoading?: boolean
  error?: string | null
}) {
  const [filter, setFilter] = useState<'all' | 'strong' | 'partial' | 'weak' | 'mismatch'>('all')
  const [showCount, setShowCount] = useState(10)

  // Calculate summary
  const summary: ICPMatchSummary = {
    strong: leads.filter(l => l.matchLevel === 'strong').length,
    partial: leads.filter(l => l.matchLevel === 'partial').length,
    weak: leads.filter(l => l.matchLevel === 'weak').length,
    mismatch: leads.filter(l => l.matchLevel === 'mismatch').length,
    total: leads.length,
    averageScore: leads.length > 0
      ? leads.reduce((sum, l) => sum + l.matchScore, 0) / leads.length
      : 0
  }

  // Filter and sort leads (mismatches first)
  const filteredLeads = leads
    .filter(lead => filter === 'all' || lead.matchLevel === filter)
    .sort((a, b) => {
      const order = { mismatch: 0, weak: 1, partial: 2, strong: 3 }
      return order[a.matchLevel] - order[b.matchLevel]
    })

  const displayedLeads = filteredLeads.slice(0, showCount)
  const hasMore = filteredLeads.length > showCount

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3" />
            <p className="text-sm">Analyzing ICP match for each lead...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">ICP Analysis Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <User size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No leads to analyze</p>
            <p className="text-xs mt-1">Upload leads to see ICP match analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <ICPMatchSummaryCard summary={summary} />

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <ICPMatchFilter
          currentFilter={filter}
          onFilterChange={setFilter}
          summary={summary}
        />
        <p className="text-xs text-muted-foreground">
          Showing {displayedLeads.length} of {filteredLeads.length}
        </p>
      </div>

      {/* Lead Cards */}
      <div className="space-y-2">
        {displayedLeads.map((lead, idx) => (
          <LeadMatchCard
            key={lead.email + idx}
            lead={lead}
            defaultExpanded={lead.matchLevel === 'mismatch' && idx < 3}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setShowCount(prev => prev + 10)}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Show more ({filteredLeads.length - showCount} remaining)
        </button>
      )}
    </div>
  )
}
