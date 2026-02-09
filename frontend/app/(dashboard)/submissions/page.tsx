'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  RefreshCw,
  Eye,
  Plus,
  FileText,
  Users,
  Mail,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  CheckSquare,
  Square,
  ThumbsUp,
  ThumbsDown,
  Zap
} from 'lucide-react'

interface Submission {
  id: string
  clientId: string
  clientName: string
  platform: 'bison' | 'instantly'
  campaigns: Array<{
    campaignId: string
    campaignName: string
    leadCount: number
  }>
  validationResults: {
    emailCopy: { score: number; issues: any[] }
    leadList: { score: number; issues: any[] }
    mailboxHealth: { score: number; issues: any[] }
  }
  strategistNotes: string
  status: 'pending' | 'approved' | 'rejected' | 'launched'
  submittedBy: string
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'launched'
type PlatformFilter = 'all' | 'bison' | 'instantly'

const ITEMS_PER_PAGE = 10

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to get urgency level for pending items
function getUrgencyLevel(dateString: string): 'normal' | 'warning' | 'urgent' {
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffHours > 48) return 'urgent'
  if (diffHours > 24) return 'warning'
  return 'normal'
}

export default function SubmissionsPage() {
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'launched'>('approved')
  const [reviewNotes, setReviewNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // New state for expandable rows and batch actions
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchActionOpen, setBatchActionOpen] = useState(false)
  const [batchAction, setBatchAction] = useState<'approved' | 'rejected'>('approved')
  const [batchNotes, setBatchNotes] = useState('')
  const [batchUpdating, setBatchUpdating] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, platformFilter, clientFilter, searchQuery])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/submissions')
      const data = await response.json()

      if (data.success) {
        setAllSubmissions(data.submissions)
      } else {
        console.error('Failed to load submissions:', data.error)
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique clients for filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = [...new Set(allSubmissions.map(s => s.clientName))].sort()
    return clients
  }, [allSubmissions])

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter(s => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      // Platform filter
      if (platformFilter !== 'all' && s.platform !== platformFilter) return false
      // Client filter
      if (clientFilter !== 'all' && s.clientName !== clientFilter) return false
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesId = s.id.toLowerCase().includes(query)
        const matchesClient = s.clientName.toLowerCase().includes(query)
        const matchesNotes = s.strategistNotes?.toLowerCase().includes(query)
        const matchesReviewer = s.reviewedBy?.toLowerCase().includes(query)
        if (!matchesId && !matchesClient && !matchesNotes && !matchesReviewer) return false
      }
      return true
    })
  }, [allSubmissions, statusFilter, platformFilter, clientFilter, searchQuery])

  // Paginate
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE)
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSubmissions.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSubmissions, currentPage])

  // Get pending submissions on current page for batch actions
  const pendingOnPage = paginatedSubmissions.filter(s => s.status === 'pending')
  const allPendingSelected = pendingOnPage.length > 0 && pendingOnPage.every(s => selectedIds.has(s.id))
  const somePendingSelected = pendingOnPage.some(s => selectedIds.has(s.id))

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      // Deselect all pending on this page
      const newSelected = new Set(selectedIds)
      pendingOnPage.forEach(s => newSelected.delete(s.id))
      setSelectedIds(newSelected)
    } else {
      // Select all pending on this page
      const newSelected = new Set(selectedIds)
      pendingOnPage.forEach(s => newSelected.add(s.id))
      setSelectedIds(newSelected)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleStatusUpdate = async () => {
    if (!selectedSubmission) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction,
          reviewedBy: 'Reviewer', // TODO: Get from auth context when available
          reviewNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        setReviewOpen(false)
        setConfirmOpen(false)
        setReviewNotes('')
        loadSubmissions()
      } else {
        alert(`Failed to update: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating submission:', error)
      alert('Failed to update submission')
    } finally {
      setUpdating(false)
    }
  }

  const handleQuickAction = async (submission: Submission, action: 'approved' | 'rejected') => {
    if (action === 'rejected') {
      // Rejections need notes, open the review dialog
      setSelectedSubmission(submission)
      setReviewAction('rejected')
      setReviewNotes('')
      setReviewOpen(true)
      return
    }

    try {
      setUpdating(true)
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          reviewedBy: 'Reviewer',
          reviewNotes: 'Quick approved'
        })
      })

      const data = await response.json()

      if (data.success) {
        loadSubmissions()
      } else {
        alert(`Failed to update: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating submission:', error)
      alert('Failed to update submission')
    } finally {
      setUpdating(false)
    }
  }

  const handleBatchAction = async () => {
    if (selectedIds.size === 0) return
    if (batchAction === 'rejected' && !batchNotes.trim()) {
      alert('Please provide notes explaining why these submissions were rejected.')
      return
    }

    try {
      setBatchUpdating(true)
      
      // Process each selected submission
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/submissions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: batchAction,
            reviewedBy: 'Reviewer',
            reviewNotes: batchNotes || `Batch ${batchAction}`
          })
        })
      )

      await Promise.all(promises)
      
      setBatchActionOpen(false)
      setBatchNotes('')
      setSelectedIds(new Set())
      loadSubmissions()
    } catch (error) {
      console.error('Error processing batch action:', error)
      alert('Failed to process some submissions')
    } finally {
      setBatchUpdating(false)
    }
  }

  const openReviewConfirm = () => {
    if (reviewAction === 'rejected' && !reviewNotes.trim()) {
      alert('Please provide notes explaining why this submission was rejected.')
      return
    }
    setConfirmOpen(true)
  }

  const exportCSV = () => {
    const headers = ['ID', 'Client', 'Platform', 'Campaigns', 'Leads', 'Score', 'Status', 'Submitted', 'Submitted By', 'Reviewer', 'Review Notes']
    const rows = filteredSubmissions.map(s => [
      s.id,
      s.clientName,
      s.platform,
      s.campaigns.length,
      totalLeads(s),
      avgScore(s),
      s.status,
      s.submittedAt,
      s.submittedBy,
      s.reviewedBy || '',
      s.reviewNotes || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `submissions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusBadge = (status: Submission['status']) => {
    const variants = {
      pending: { icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      approved: { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      rejected: { icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
      launched: { icon: Rocket, className: 'bg-blue-100 text-blue-700 border-blue-200' }
    }
    const config = variants[status]
    const Icon = config.icon

    return (
      <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalLeads = (submission: Submission) => 
    submission.campaigns.reduce((sum, c) => sum + c.leadCount, 0)

  const avgScore = (submission: Submission) => {
    const { emailCopy, leadList, mailboxHealth } = submission.validationResults
    return Math.round((emailCopy.score + leadList.score + mailboxHealth.score) / 3)
  }

  // Stats summary (from all submissions, not filtered)
  const stats = {
    total: allSubmissions.length,
    pending: allSubmissions.filter(s => s.status === 'pending').length,
    approved: allSubmissions.filter(s => s.status === 'approved').length,
    rejected: allSubmissions.filter(s => s.status === 'rejected').length,
    launched: allSubmissions.filter(s => s.status === 'launched').length
  }

  // Check for urgent pending items
  const urgentPending = allSubmissions.filter(
    s => s.status === 'pending' && getUrgencyLevel(s.submittedAt) === 'urgent'
  ).length

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <Header 
          title="Submissions" 
          description="Review and approve delivery checklist submissions"
        />

        <div className="p-8 space-y-6">
          {/* Urgent Alert Banner */}
          {urgentPending > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div className="flex-1">
                <p className="font-medium text-red-800">
                  {urgentPending} submission{urgentPending > 1 ? 's' : ''} waiting over 48 hours
                </p>
                <p className="text-sm text-red-600">These need immediate attention</p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => setStatusFilter('pending')}
              >
                View Pending
              </Button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-gray-400' : ''}`} onClick={() => setStatusFilter('all')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="text-gray-400" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className={`bg-amber-50 cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-amber-400' : ''}`} onClick={() => setStatusFilter('pending')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600">Pending</p>
                    <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                    {urgentPending > 0 && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {urgentPending} urgent
                      </p>
                    )}
                  </div>
                  <Clock className="text-amber-400" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className={`bg-emerald-50 cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-emerald-400' : ''}`} onClick={() => setStatusFilter('approved')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600">Approved</p>
                    <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
                  </div>
                  <CheckCircle className="text-emerald-400" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className={`bg-red-50 cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-400' : ''}`} onClick={() => setStatusFilter('rejected')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Rejected</p>
                    <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                  </div>
                  <XCircle className="text-red-400" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className={`bg-blue-50 cursor-pointer transition-all ${statusFilter === 'launched' ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setStatusFilter('launched')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Launched</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.launched}</p>
                  </div>
                  <Rocket className="text-blue-400" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search ID, client, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="launched">Launched</SelectItem>
              </SelectContent>
            </Select>

            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instantly">Instantly</SelectItem>
                <SelectItem value="bison">Bison</SelectItem>
              </SelectContent>
            </Select>

            {/* Client Filter */}
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Batch Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-700">
                  {selectedIds.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => {
                    setBatchAction('approved')
                    setBatchNotes('')
                    setBatchActionOpen(true)
                  }}
                >
                  <ThumbsUp size={12} className="mr-1" />
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setBatchAction('rejected')
                    setBatchNotes('')
                    setBatchActionOpen(true)
                  }}
                >
                  <ThumbsDown size={12} className="mr-1" />
                  Reject All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Actions */}
            <Button variant="outline" size="sm" onClick={loadSubmissions}>
              <RefreshCw size={14} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredSubmissions.length === 0}>
              <Download size={14} className="mr-2" />
              Export CSV
            </Button>
            <Button asChild>
              <Link href="/delivery-checklist">
                <Plus size={14} className="mr-2" />
                New Submission
              </Link>
            </Button>
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {paginatedSubmissions.length} of {filteredSubmissions.length} submissions
              {filteredSubmissions.length !== allSubmissions.length && ` (filtered from ${allSubmissions.length})`}
            </span>
            {totalPages > 1 && (
              <span>Page {currentPage} of {totalPages}</span>
            )}
          </div>

          {/* Submissions Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
              ) : paginatedSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-900">No submissions found</h3>
                  <p className="text-gray-500 mt-1">
                    {searchQuery || statusFilter !== 'all' || platformFilter !== 'all' || clientFilter !== 'all'
                      ? 'Try adjusting your filters.' 
                      : 'Create your first submission from the delivery checklist.'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && platformFilter === 'all' && clientFilter === 'all' && (
                    <Button className="mt-4" asChild>
                      <Link href="/delivery-checklist">
                        <Plus size={14} className="mr-2" />
                        Create Submission
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        {pendingOnPage.length > 0 && (
                          <Checkbox
                            checked={allPendingSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all pending"
                          />
                        )}
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Campaigns</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubmissions.map((submission) => {
                      const isExpanded = expandedRows.has(submission.id)
                      const isPending = submission.status === 'pending'
                      const urgency = isPending ? getUrgencyLevel(submission.submittedAt) : 'normal'
                      const score = avgScore(submission)
                      
                      return (
                        <>
                          <TableRow 
                            key={submission.id}
                            className={`
                              ${isPending ? 'bg-amber-50/50' : ''}
                              ${urgency === 'urgent' ? 'bg-red-50/50 border-l-4 border-l-red-400' : ''}
                              ${urgency === 'warning' ? 'bg-amber-50/80 border-l-4 border-l-amber-400' : ''}
                              ${isExpanded ? 'border-b-0' : ''}
                            `}
                          >
                            <TableCell>
                              {isPending && (
                                <Checkbox
                                  checked={selectedIds.has(submission.id)}
                                  onCheckedChange={() => toggleSelect(submission.id)}
                                  aria-label={`Select ${submission.clientName}`}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => toggleRowExpand(submission.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp size={16} className="text-gray-400" />
                                ) : (
                                  <ChevronDown size={16} className="text-gray-400" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {submission.clientName}
                                {urgency === 'urgent' && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle size={14} className="text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Waiting over 48 hours</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {submission.platform}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Mail size={14} className="text-gray-400" />
                                {submission.campaigns.length}
                                <span className="text-gray-400 text-xs">
                                  ({totalLeads(submission).toLocaleString()} leads)
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${getScoreColor(score)}`}>
                                      {score}%
                                    </span>
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${getScoreBgColor(score)} transition-all`}
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div>Email: {submission.validationResults.emailCopy.score}%</div>
                                    <div>Leads: {submission.validationResults.leadList.score}%</div>
                                    <div>Mailbox: {submission.validationResults.mailboxHealth.score}%</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(submission.status)}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className={`text-sm ${urgency === 'urgent' ? 'text-red-600 font-medium' : urgency === 'warning' ? 'text-amber-600' : 'text-gray-500'}`}>
                                    {formatRelativeTime(submission.submittedAt)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {formatDate(submission.submittedAt)}
                                  <br />
                                  by {submission.submittedBy}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isPending && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                          onClick={() => handleQuickAction(submission, 'approved')}
                                          disabled={updating}
                                        >
                                          <ThumbsUp size={16} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Quick Approve</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleQuickAction(submission, 'rejected')}
                                          disabled={updating}
                                        >
                                          <ThumbsDown size={16} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reject</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubmission(submission)
                                    setDetailsOpen(true)
                                  }}
                                >
                                  <Eye size={14} className="mr-1" />
                                  View
                                </Button>
                                {submission.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubmission(submission)
                                      setReviewAction('launched')
                                      setReviewNotes('')
                                      setReviewOpen(true)
                                    }}
                                  >
                                    <Rocket size={14} className="mr-1" />
                                    Launch
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row Details */}
                          {isExpanded && (
                            <TableRow className="bg-gray-50/80">
                              <TableCell colSpan={9} className="p-4">
                                <div className="grid grid-cols-3 gap-6">
                                  {/* Score Breakdown */}
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-1">
                                      <Zap size={14} />
                                      Score Breakdown
                                    </h4>
                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600">Email Copy</span>
                                          <span className={getScoreColor(submission.validationResults.emailCopy.score)}>
                                            {submission.validationResults.emailCopy.score}%
                                          </span>
                                        </div>
                                        <Progress 
                                          value={submission.validationResults.emailCopy.score} 
                                          className="h-2"
                                        />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600">Lead List</span>
                                          <span className={getScoreColor(submission.validationResults.leadList.score)}>
                                            {submission.validationResults.leadList.score}%
                                          </span>
                                        </div>
                                        <Progress 
                                          value={submission.validationResults.leadList.score} 
                                          className="h-2"
                                        />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600">Mailbox Health</span>
                                          <span className={getScoreColor(submission.validationResults.mailboxHealth.score)}>
                                            {submission.validationResults.mailboxHealth.score}%
                                          </span>
                                        </div>
                                        <Progress 
                                          value={submission.validationResults.mailboxHealth.score} 
                                          className="h-2"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Campaigns */}
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-1">
                                      <Mail size={14} />
                                      Campaigns ({submission.campaigns.length})
                                    </h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {submission.campaigns.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border">
                                          <span className="truncate flex-1 mr-2">{c.campaignName}</span>
                                          <Badge variant="secondary" className="shrink-0">
                                            {c.leadCount.toLocaleString()}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Notes & Review */}
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-1">
                                      <FileText size={14} />
                                      Notes
                                    </h4>
                                    {submission.strategistNotes ? (
                                      <div className="bg-white rounded-lg px-3 py-2 text-sm border mb-3">
                                        <p className="text-gray-600 text-xs uppercase mb-1">Strategist</p>
                                        <p>{submission.strategistNotes}</p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic mb-3">No strategist notes</p>
                                    )}
                                    {submission.reviewNotes && (
                                      <div className="bg-white rounded-lg px-3 py-2 text-sm border">
                                        <p className="text-gray-600 text-xs uppercase mb-1">
                                          Reviewer ({submission.reviewedBy})
                                        </p>
                                        <p>{submission.reviewNotes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Submission ID */}
                                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-gray-400">
                                  <span className="font-mono">ID: {submission.id}</span>
                                  {submission.reviewedAt && (
                                    <span>Reviewed {formatRelativeTime(submission.reviewedAt)} by {submission.reviewedBy}</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-10"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {selectedSubmission?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(selectedSubmission.status)}
                  <span className="text-sm text-gray-500">
                    Submitted {formatRelativeTime(selectedSubmission.submittedAt)}
                  </span>
                </div>

                {/* Client & Platform */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Client</Label>
                    <p className="font-medium">{selectedSubmission.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Platform</Label>
                    <p className="font-medium capitalize">{selectedSubmission.platform}</p>
                  </div>
                </div>

                {/* Campaigns */}
                <div>
                  <Label className="text-gray-500">Campaigns ({selectedSubmission.campaigns.length})</Label>
                  <div className="mt-2 space-y-2">
                    {selectedSubmission.campaigns.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span className="font-medium">{c.campaignName}</span>
                        <Badge variant="secondary">{c.leadCount.toLocaleString()} leads</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Scores */}
                <div>
                  <Label className="text-gray-500">Validation Scores</Label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <Card className="bg-gray-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Email Copy</p>
                        <p className={`text-xl font-bold ${getScoreColor(selectedSubmission.validationResults.emailCopy.score)}`}>
                          {selectedSubmission.validationResults.emailCopy.score}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Lead List</p>
                        <p className={`text-xl font-bold ${getScoreColor(selectedSubmission.validationResults.leadList.score)}`}>
                          {selectedSubmission.validationResults.leadList.score}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Mailbox Health</p>
                        <p className={`text-xl font-bold ${getScoreColor(selectedSubmission.validationResults.mailboxHealth.score)}`}>
                          {selectedSubmission.validationResults.mailboxHealth.score}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Strategist Notes */}
                {selectedSubmission.strategistNotes && (
                  <div>
                    <Label className="text-gray-500">Strategist Notes</Label>
                    <p className="mt-1 text-sm bg-gray-50 rounded-lg p-3">
                      {selectedSubmission.strategistNotes}
                    </p>
                  </div>
                )}

                {/* Review Info */}
                {selectedSubmission.reviewedBy && (
                  <div className="border-t pt-4">
                    <Label className="text-gray-500">Review</Label>
                    <div className="mt-2 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{selectedSubmission.reviewedBy}</span>
                        <span className="text-sm text-gray-500">
                          {selectedSubmission.reviewedAt && formatRelativeTime(selectedSubmission.reviewedAt)}
                        </span>
                      </div>
                      {selectedSubmission.reviewNotes && (
                        <p className="text-sm text-gray-700">{selectedSubmission.reviewNotes}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <DialogFooter>
                  {selectedSubmission.status === 'pending' && (
                    <Button onClick={() => {
                      setDetailsOpen(false)
                      setReviewAction('approved')
                      setReviewNotes('')
                      setReviewOpen(true)
                    }}>
                      Review This Submission
                    </Button>
                  )}
                  {selectedSubmission.status === 'approved' && (
                    <Button onClick={() => {
                      setDetailsOpen(false)
                      setReviewAction('launched')
                      setReviewNotes('')
                      setReviewOpen(true)
                    }}>
                      <Rocket size={14} className="mr-1" />
                      Mark as Launched
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'launched' ? 'Mark as Launched' : 'Review Submission'}
              </DialogTitle>
              <DialogDescription>
                {selectedSubmission?.clientName} - {selectedSubmission?.campaigns.length} campaign(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {reviewAction !== 'launched' && (
                <div className="flex gap-2">
                  <Button
                    variant={reviewAction === 'approved' ? 'default' : 'outline'}
                    className={reviewAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => setReviewAction('approved')}
                  >
                    <CheckCircle size={16} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewAction === 'rejected' ? 'default' : 'outline'}
                    className={reviewAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => setReviewAction('rejected')}
                  >
                    <XCircle size={16} className="mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              <div>
                <Label htmlFor="review-notes">
                  {reviewAction === 'rejected' ? 'Rejection Reason (Required)' : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="review-notes"
                  placeholder={reviewAction === 'rejected' 
                    ? 'Explain what needs to be fixed...'
                    : 'Add any notes for the strategist...'}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={openReviewConfirm}
                disabled={updating}
                className={
                  reviewAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  reviewAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }
              >
                {updating && <Loader2 className="animate-spin mr-2" size={16} />}
                {reviewAction === 'approved' && 'Approve Delivery'}
                {reviewAction === 'rejected' && 'Reject Submission'}
                {reviewAction === 'launched' && 'Confirm Launch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {reviewAction === 'approved' && 'Approve this delivery?'}
                {reviewAction === 'rejected' && 'Reject this submission?'}
                {reviewAction === 'launched' && 'Mark as launched?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {reviewAction === 'approved' && 
                  `This will approve ${selectedSubmission?.clientName}'s delivery request. The strategist will be notified.`}
                {reviewAction === 'rejected' && 
                  `This will reject the submission. The strategist will need to make changes and resubmit.`}
                {reviewAction === 'launched' && 
                  `This marks the campaign as launched. This action indicates the campaign is now live.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStatusUpdate}
                className={
                  reviewAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  reviewAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }
              >
                {updating && <Loader2 className="animate-spin mr-2" size={16} />}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Action Dialog */}
        <Dialog open={batchActionOpen} onOpenChange={setBatchActionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {batchAction === 'approved' ? 'Approve' : 'Reject'} {selectedIds.size} Submissions
              </DialogTitle>
              <DialogDescription>
                This will {batchAction === 'approved' ? 'approve' : 'reject'} all selected pending submissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="batch-notes">
                  {batchAction === 'rejected' ? 'Rejection Reason (Required)' : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="batch-notes"
                  placeholder={batchAction === 'rejected' 
                    ? 'Explain what needs to be fixed...'
                    : 'Add any notes for the strategists...'}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchActionOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBatchAction}
                disabled={batchUpdating || (batchAction === 'rejected' && !batchNotes.trim())}
                className={
                  batchAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-red-600 hover:bg-red-700'
                }
              >
                {batchUpdating && <Loader2 className="animate-spin mr-2" size={16} />}
                {batchAction === 'approved' ? 'Approve All' : 'Reject All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
