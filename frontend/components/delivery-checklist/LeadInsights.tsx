'use client'

import { useState } from 'react'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Copy,
  ChevronDown,
  ChevronRight,
  Mail,
  Building2,
  Briefcase,
  Globe,
  Loader2,
  Target
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { ICPMatchAnalysis, type LeadAnalysis, type ICPMatchSummary } from './LeadMatchCard'

// Types for processed lead insights
export interface FieldCoverage {
  field: string
  count: number
  percentage: number
}

export interface DistributionItem {
  value: string
  count: number
  percentage: number
}

export interface DataQualityIssues {
  invalidEmails: string[]
  disposableEmails: string[]
  genericEmails: string[]
  duplicateEmails: string[]
}

export interface ProcessedLeadInsights {
  summary: {
    totalLeads: number
    validLeads: number
    invalidLeads: number
    duplicatesFound: number
  }
  fieldCoverage: FieldCoverage[]
  dataQualityScore: number
  distributions: {
    jobTitles: DistributionItem[]
    industries: DistributionItem[]
    companySizes: DistributionItem[]
    emailDomains: DistributionItem[]
  }
  issues: DataQualityIssues
  sampleData: Array<Record<string, string | null>>
}

interface LeadInsightsProps {
  insights: ProcessedLeadInsights | null
  isLoading: boolean
  error: string | null
  // Optional ICP match analysis data
  icpMatchData?: {
    leads: LeadAnalysis[]
    summary: ICPMatchSummary
    isLoading: boolean
    error: string | null
  }
}

// Helper: Calculate average field coverage
function calculateFieldCoverageScore(fieldCoverage: FieldCoverage[]): number {
  if (!fieldCoverage.length) return 0
  const total = fieldCoverage.reduce((sum, f) => sum + f.percentage, 0)
  return Math.round(total / fieldCoverage.length)
}

// Helper: Get color class based on percentage
function getBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-500'
  if (percentage >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

// Helper: Get text color class based on percentage
function getTextColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600'
  if (percentage >= 50) return 'text-amber-600'
  return 'text-red-600'
}

// Helper: Get quality badge based on score
function getQualityBadge(score: number): { color: string; label: string } {
  if (score >= 80) return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Excellent' }
  if (score >= 60) return { color: 'bg-green-100 text-green-700 border-green-200', label: 'Good' }
  if (score >= 40) return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Fair' }
  return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Poor' }
}

// Component: Summary Card
function SummaryCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  color
}: {
  title: string
  value: string | number
  subtitle?: string
  description?: string
  icon: React.ElementType
  color: 'emerald' | 'amber' | 'red' | 'blue' | 'gray'
}) {
  const colorStyles = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const iconBg = {
    emerald: 'bg-emerald-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
    blue: 'bg-blue-100',
    gray: 'bg-gray-100'
  }

  return (
    <Card className={`border ${colorStyles[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs font-medium mt-1">{subtitle}</p>
            )}
            {description && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{description}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg ${iconBg[color]} flex items-center justify-center flex-shrink-0`}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Component: Horizontal Bar
function HorizontalBar({
  label,
  value,
  percentage,
  maxPercentage = 100
}: {
  label: string
  value: number
  percentage: number
  maxPercentage?: number
}) {
  const width = Math.min((percentage / maxPercentage) * 100, 100)
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="truncate max-w-[60%]" title={label}>{label}</span>
        <span className="text-muted-foreground flex-shrink-0">
          {value} <span className={`font-medium ${getTextColor(percentage)}`}>({percentage}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

// Component: Simple Bar (for distributions where we don't color code by threshold)
function SimpleBar({
  label,
  value,
  percentage,
  color = 'bg-blue-500'
}: {
  label: string
  value: number
  percentage: number
  color?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="truncate max-w-[60%]" title={label}>{label}</span>
        <span className="text-muted-foreground flex-shrink-0">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Component: Issue Alert Card
function IssueAlertCard({
  title,
  count,
  icon: Icon,
  severity,
  items,
  collapsible = false,
  description
}: {
  title: string
  count: number
  icon: React.ElementType
  severity: 'error' | 'warning' | 'info'
  items?: string[]
  collapsible?: boolean
  description?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const severityStyles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  }

  const iconColors = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500'
  }

  if (count === 0) return null

  const content = (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${severityStyles[severity]}`}>
      <Icon size={18} className={`${iconColors[severity]} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/50">{count}</span>
        </div>
        {description && (
          <p className="text-xs opacity-70 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      {collapsible && items && items.length > 0 && (
        <div className="flex-shrink-0">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      )}
    </div>
  )

  if (!collapsible || !items || items.length === 0) {
    return content
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full text-left">
        {content}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-7 p-2 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
          {items.slice(0, 20).map((item, idx) => (
            <p key={idx} className="text-xs text-gray-600 font-mono py-0.5">{item}</p>
          ))}
          {items.length > 20 && (
            <p className="text-xs text-gray-400 pt-1">...and {items.length - 20} more</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Main Component
export function LeadInsights({ insights, isLoading, error, icpMatchData }: LeadInsightsProps) {
  if (isLoading) {
    return (
      <Card className="shadow-medium">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="text-sm">Analyzing lead data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-medium border-red-200 bg-red-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Analysis Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!insights || !insights.summary) {
    return (
      <Card className="shadow-medium">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Upload a CSV file to see lead insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { summary, fieldCoverage = [], dataQualityScore = 0, distributions, issues, sampleData = [] } = insights
  const safeDistributions = {
    jobTitles: distributions?.jobTitles || [],
    industries: distributions?.industries || [],
    companySizes: distributions?.companySizes || [],
    emailDomains: distributions?.emailDomains || []
  }
  const safeIssues = {
    invalidEmails: issues?.invalidEmails || [],
    disposableEmails: issues?.disposableEmails || [],
    genericEmails: issues?.genericEmails || [],
    duplicateEmails: issues?.duplicateEmails || []
  }
  const fieldCoverageScore = calculateFieldCoverageScore(fieldCoverage)
  const qualityBadge = getQualityBadge(dataQualityScore)
  const hasIssues = safeIssues.invalidEmails.length > 0 ||
    safeIssues.disposableEmails.length > 0 ||
    safeIssues.genericEmails.length > 0 ||
    safeIssues.duplicateEmails.length > 0

  // Get max count for distribution bars
  const getMaxCount = (items: DistributionItem[]) => Math.max(...items.map(i => i.count), 1)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Leads"
          value={summary.totalLeads.toLocaleString()}
          subtitle={`✓ ${summary.validLeads.toLocaleString()} valid${summary.invalidLeads > 0 ? ` · ✗ ${summary.invalidLeads.toLocaleString()} invalid` : ''}`}
          description="Number of rows in your CSV. Valid = properly formatted email address."
          icon={Users}
          color={summary.invalidLeads === 0 ? 'emerald' : summary.invalidLeads < summary.totalLeads * 0.1 ? 'amber' : 'red'}
        />
        <SummaryCard
          title="Field Coverage"
          value={`${fieldCoverageScore}%`}
          subtitle={fieldCoverageScore >= 80 ? 'Great coverage' : fieldCoverageScore >= 50 ? 'Partial coverage' : 'Low coverage'}
          description="How many leads have data filled in for each column (email, name, company, etc). Higher = more personalization options."
          icon={BarChart3}
          color={fieldCoverageScore >= 80 ? 'emerald' : fieldCoverageScore >= 50 ? 'amber' : 'red'}
        />
        <SummaryCard
          title="Data Quality"
          value={`${dataQualityScore}%`}
          subtitle={qualityBadge.label}
          description="% of leads with valid emails (not invalid, disposable, or duplicate). 100% = all leads are clean and ready to send."
          icon={CheckCircle2}
          color={dataQualityScore >= 80 ? 'emerald' : dataQualityScore >= 50 ? 'amber' : 'red'}
        />
        <SummaryCard
          title="Duplicates"
          value={summary.duplicatesFound.toLocaleString()}
          subtitle={summary.duplicatesFound === 0 ? '✓ All unique' : `⚠ ${summary.duplicatesFound} repeated`}
          description="Same email appearing multiple times in the list. Duplicates waste sends and hurt deliverability."
          icon={Copy}
          color={summary.duplicatesFound === 0 ? 'emerald' : summary.duplicatesFound < 5 ? 'amber' : 'red'}
        />
      </div>

      {/* Field Coverage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            Field Coverage
          </CardTitle>
          <CardDescription>
            Shows what % of leads have data in each column. <span className="font-medium">Green = 80%+</span> (great for personalization), <span className="font-medium">Yellow = 50-79%</span> (some gaps), <span className="font-medium">Red = under 50%</span> (many empty).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fieldCoverage.map((field) => (
              <HorizontalBar
                key={field.field}
                label={field.field}
                value={field.count}
                percentage={field.percentage}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distributions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lead Distributions</CardTitle>
          <CardDescription>
            Who's in your list? This shows the most common job titles, industries, company sizes, and email domains. Use this to verify your ICP targeting is on point.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="jobTitles" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="jobTitles" className="text-xs">
                <Briefcase size={14} className="mr-1.5 hidden sm:inline" />
                Job Titles
              </TabsTrigger>
              <TabsTrigger value="industries" className="text-xs">
                <Building2 size={14} className="mr-1.5 hidden sm:inline" />
                Industries
              </TabsTrigger>
              <TabsTrigger value="companySizes" className="text-xs">
                <Users size={14} className="mr-1.5 hidden sm:inline" />
                Company Size
              </TabsTrigger>
              <TabsTrigger value="emailDomains" className="text-xs">
                <Globe size={14} className="mr-1.5 hidden sm:inline" />
                Domains
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobTitles" className="mt-0">
              {safeDistributions.jobTitles.length > 0 ? (
                <div className="space-y-2.5">
                  {safeDistributions.jobTitles.slice(0, 10).map((item, idx) => (
                    <SimpleBar
                      key={idx}
                      label={item.value}
                      value={item.count}
                      percentage={(item.count / getMaxCount(safeDistributions.jobTitles)) * 100}
                      color="bg-violet-500"
                    />
                  ))}
                  {safeDistributions.jobTitles.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{safeDistributions.jobTitles.length - 10} more job titles
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No job title data available</p>
              )}
            </TabsContent>

            <TabsContent value="industries" className="mt-0">
              {safeDistributions.industries.length > 0 ? (
                <div className="space-y-2.5">
                  {safeDistributions.industries.slice(0, 10).map((item, idx) => (
                    <SimpleBar
                      key={idx}
                      label={item.value}
                      value={item.count}
                      percentage={(item.count / getMaxCount(safeDistributions.industries)) * 100}
                      color="bg-cyan-500"
                    />
                  ))}
                  {safeDistributions.industries.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{safeDistributions.industries.length - 10} more industries
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No industry data available</p>
              )}
            </TabsContent>

            <TabsContent value="companySizes" className="mt-0">
              {safeDistributions.companySizes.length > 0 ? (
                <div className="space-y-2.5">
                  {safeDistributions.companySizes.map((item, idx) => (
                    <SimpleBar
                      key={idx}
                      label={item.value}
                      value={item.count}
                      percentage={(item.count / getMaxCount(safeDistributions.companySizes)) * 100}
                      color="bg-orange-500"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No company size data available</p>
              )}
            </TabsContent>

            <TabsContent value="emailDomains" className="mt-0">
              {safeDistributions.emailDomains.length > 0 ? (
                <div className="space-y-2.5">
                  {safeDistributions.emailDomains.slice(0, 10).map((item, idx) => (
                    <SimpleBar
                      key={idx}
                      label={item.value}
                      value={item.count}
                      percentage={(item.count / getMaxCount(safeDistributions.emailDomains)) * 100}
                      color="bg-rose-500"
                    />
                  ))}
                  {safeDistributions.emailDomains.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{safeDistributions.emailDomains.length - 10} more domains
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No email domain data available</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Data Quality Issues */}
      {hasIssues && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Data Quality Issues
            </CardTitle>
            <CardDescription>
              These leads should be reviewed or removed before sending. Click each to see the affected emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <IssueAlertCard
                title="Invalid Emails"
                count={safeIssues.invalidEmails.length}
                icon={AlertCircle}
                severity="error"
                items={safeIssues.invalidEmails}
                collapsible
                description="Malformed email addresses (missing @, invalid characters, etc). These will bounce 100%."
              />
              <IssueAlertCard
                title="Disposable Emails"
                count={safeIssues.disposableEmails.length}
                icon={AlertTriangle}
                severity="warning"
                items={safeIssues.disposableEmails}
                collapsible
                description="Temporary email services (mailinator, guerrillamail, etc). Real prospects don't use these."
              />
              <IssueAlertCard
                title="Generic Emails"
                count={safeIssues.genericEmails.length}
                icon={Mail}
                severity="warning"
                items={safeIssues.genericEmails}
                collapsible
                description="Role-based addresses (info@, support@, admin@). Lower reply rates, but sometimes valid for small companies."
              />
              <IssueAlertCard
                title="Duplicate Emails"
                count={safeIssues.duplicateEmails.length}
                icon={Copy}
                severity="error"
                items={safeIssues.duplicateEmails}
                collapsible
                description="Same email appears multiple times. Wastes sending volume and looks unprofessional."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Preview Table */}
      {sampleData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sample Preview</CardTitle>
            <CardDescription>
              First {Math.min(sampleData.length, 10)} rows from your CSV. Red cells = empty data (won't personalize). Scroll right to see all columns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50">
                    <TableRow>
                      {Object.keys(sampleData[0]).map((header) => (
                        <TableHead key={header} className="whitespace-nowrap text-xs font-semibold">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleData.slice(0, 10).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {Object.entries(row).map(([key, value], colIdx) => (
                          <TableCell
                            key={colIdx}
                            className={`text-xs whitespace-nowrap max-w-[200px] truncate ${
                              !value || value === '' ? 'bg-red-50 text-red-400 italic' : ''
                            }`}
                            title={value || 'Empty'}
                          >
                            {value || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {sampleData.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing 10 of {sampleData.length} sample rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ICP Match Analysis Section */}
      {icpMatchData && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={18} className="text-indigo-600" />
              ICP Match Analysis
            </CardTitle>
            <CardDescription>
              How well each lead matches your Ideal Customer Profile. Mismatches are shown first to help you identify problem leads before launch.
              {icpMatchData.summary && (
                <span className="block mt-1 font-medium">
                  {icpMatchData.summary.strong} strong matches, {icpMatchData.summary.partial} partial, {icpMatchData.summary.weak} weak, {icpMatchData.summary.mismatch} mismatches
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ICPMatchAnalysis
              leads={icpMatchData.leads}
              isLoading={icpMatchData.isLoading}
              error={icpMatchData.error}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
