'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, FileText, Target, ClipboardList, Trash2, Sparkles, Mail, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ICPPreview, ExtractedICP } from '@/components/icp/ICPPreview'

interface ClientContext {
  clientId: string
  clientName: string
  icpSummary: string
  specialRequirements: string
  transcriptNotes: string
  updatedAt: string
  // Communication tracking
  clientEmail?: string
  slackChannelId?: string
  slackChannelName?: string
}

interface SlackChannel {
  id: string
  name: string
  type: string
  member_count: number
}

export default function ClientContextPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const clientId = decodeURIComponent(resolvedParams.id)
  
  const [context, setContext] = useState<ClientContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // ICP Extraction state
  const [extracting, setExtracting] = useState(false)
  const [extractedICP, setExtractedICP] = useState<ExtractedICP | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  
  // Slack channels state
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [refreshingChannels, setRefreshingChannels] = useState(false)

  useEffect(() => {
    loadContext()
    loadSlackChannels()
  }, [clientId])

  const loadSlackChannels = async () => {
    setLoadingChannels(true)
    try {
      const response = await fetch('/api/slack-channels')
      const data = await response.json()
      if (data.success) {
        setSlackChannels(data.channels || [])
        // If no channels, auto-refresh
        if (data.needsRefresh || (data.channels?.length === 0)) {
          refreshSlackChannels()
        }
      }
    } catch (error) {
      console.error('Error loading Slack channels:', error)
    } finally {
      setLoadingChannels(false)
    }
  }

  const refreshSlackChannels = async () => {
    setRefreshingChannels(true)
    try {
      const response = await fetch('/api/slack-channels', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        // Reload channels after refresh
        await loadSlackChannels()
      }
    } catch (error) {
      console.error('Error refreshing Slack channels:', error)
    } finally {
      setRefreshingChannels(false)
    }
  }

  const handleSlackChannelSelect = (channelId: string) => {
    const channel = slackChannels.find(c => c.id === channelId)
    if (channel && context) {
      setContext({
        ...context,
        slackChannelId: channel.id,
        slackChannelName: channel.name
      })
    } else if (!channelId && context) {
      setContext({
        ...context,
        slackChannelId: '',
        slackChannelName: ''
      })
    }
  }

  const loadContext = async () => {
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/context`)
      const data = await response.json()
      if (data.success) {
        setContext(data.context)
      }
    } catch (error) {
      console.error('Error loading context:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveContext = async () => {
    if (!context) return
    
    setSaving(true)
    setSaveSuccess(false)
    
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      })
      
      const data = await response.json()
      if (data.success) {
        setContext(data.context)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error saving context:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof ClientContext, value: string) => {
    if (!context) return
    setContext({ ...context, [field]: value })
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/context`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        // Redirect back to clients list
        window.location.href = '/clients'
      }
    } catch (error) {
      console.error('Error deleting context:', error)
    } finally {
      setDeleting(false)
    }
  }

  const clearAllFields = () => {
    if (!context) return
    setContext({
      ...context,
      icpSummary: '',
      specialRequirements: '',
      transcriptNotes: ''
    })
  }

  const extractICP = async () => {
    if (!context?.transcriptNotes || context.transcriptNotes.trim().length < 50) {
      setExtractError('Please paste a transcript with at least 50 characters')
      return
    }

    setExtracting(true)
    setExtractError(null)
    setExtractedICP(null)

    try {
      const response = await fetch('/api/extract-icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: context.transcriptNotes,
          clientName: context.clientName
        })
      })

      const data = await response.json()

      if (data.success && data.data) {
        setExtractedICP(data.data)
      } else {
        setExtractError(data.error || 'Failed to extract ICP')
      }
    } catch (error) {
      console.error('Error extracting ICP:', error)
      setExtractError('Failed to connect to AI service')
    } finally {
      setExtracting(false)
    }
  }

  const applyExtractedICP = (data: ExtractedICP) => {
    if (!context) return

    // Generate markdown from extracted data
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
    
    const lines: string[] = []
    lines.push(`# ICP Summary - ${context.clientName}`)
    lines.push(`*Extracted from transcript on ${dateStr}*`)
    lines.push('')
    
    if (data.targetTitles.length > 0) {
      lines.push('## Target Titles')
      data.targetTitles.forEach(title => lines.push(`- ${title}`))
      lines.push('')
    }
    
    if (data.companySizes.length > 0) {
      lines.push('## Company Size')
      lines.push(data.companySizes.join(', ') + ' employees')
      lines.push('')
    }
    
    if (data.industries.length > 0) {
      lines.push('## Industries')
      data.industries.forEach(industry => lines.push(`- ${industry}`))
      lines.push('')
    }
    
    if (data.geography.length > 0) {
      lines.push('## Geography')
      lines.push(data.geography.join(', '))
      lines.push('')
    }
    
    if (data.exclusions.length > 0) {
      lines.push('## Exclusions')
      data.exclusions.forEach(exc => lines.push(`- ${exc}`))
      lines.push('')
    }
    
    if (data.painPoints.length > 0) {
      lines.push('## Pain Points')
      data.painPoints.forEach(pain => lines.push(`- ${pain}`))
      lines.push('')
    }
    
    if (data.budget) {
      lines.push('## Budget')
      lines.push(data.budget)
      lines.push('')
    }
    
    if (data.timeline) {
      lines.push('## Timeline')
      lines.push(data.timeline)
      lines.push('')
    }
    
    if (data.keyQuotes.length > 0) {
      lines.push('## Key Quotes')
      data.keyQuotes.forEach(quote => lines.push(`> "${quote}"`))
      lines.push('')
    }

    const markdown = lines.join('\n')

    // Update the ICP Summary field
    const existingICP = context.icpSummary.trim()
    const newICP = existingICP 
      ? `${markdown}\n---\n\n${existingICP}`  // Prepend new extraction
      : markdown

    setContext({ ...context, icpSummary: newICP })
    setExtractedICP(null)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never saved'
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Client Context" description="Loading..." />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header 
        title={`Context: ${context?.clientName || clientId}`}
        description="ICP, requirements, and onboarding notes"
      />

      <div className="p-8 space-y-6">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link 
            href="/clients"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to clients</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {context?.updatedAt && (
              <span className="text-sm text-gray-500">
                Last updated: {formatDate(context.updatedAt)}
              </span>
            )}
            <Button
              variant="outline"
              onClick={clearAllFields}
              className="text-gray-600"
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete
            </Button>
            <Button 
              onClick={saveContext} 
              disabled={saving}
              className={saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Save size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Communication Settings */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Mail className="text-purple-600" size={16} />
              </div>
              Communication Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientEmail" className="text-sm text-gray-600 mb-2 block">
                Client Email Address
              </Label>
              <input
                id="clientEmail"
                type="email"
                placeholder="client@company.com"
                value={context?.clientEmail || ''}
                onChange={(e) => updateField('clientEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to search for emails (more accurate than name matching)
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="slackChannel" className="text-sm text-gray-600">
                  Slack Channel
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshSlackChannels}
                  disabled={refreshingChannels}
                  className="text-xs h-6 px-2"
                >
                  {refreshingChannels ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : (
                    <RefreshCw size={12} className="mr-1" />
                  )}
                  Refresh
                </Button>
              </div>
              <select
                id="slackChannel"
                value={context?.slackChannelId || ''}
                onChange={(e) => handleSlackChannelSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="">-- Select a Slack channel --</option>
                {slackChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
              {context?.slackChannelId && (
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  ID: {context.slackChannelId}
                </p>
              )}
              {loadingChannels && (
                <p className="text-xs text-gray-400 mt-1">Loading channels...</p>
              )}
              {!loadingChannels && slackChannels.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No channels found. Click Refresh to load from Slack.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ICP Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="text-blue-600" size={16} />
              </div>
              ICP Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="icpSummary" className="text-sm text-gray-600 mb-2 block">
              Ideal Customer Profile - who are we targeting for this client?
            </Label>
            <Textarea
              id="icpSummary"
              placeholder="# ICP Summary&#10;&#10;Target: VP of Sales at B2B SaaS companies, 50-500 employees...&#10;&#10;Industries:&#10;- Technology&#10;- Healthcare&#10;&#10;Pain points:&#10;- ..."
              value={context?.icpSummary || ''}
              onChange={(e) => updateField('icpSummary', e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Special Requirements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ClipboardList className="text-amber-600" size={16} />
              </div>
              Special Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="specialRequirements" className="text-sm text-gray-600 mb-2 block">
              Client-specific rules, exclusions, and preferences
            </Label>
            <Textarea
              id="specialRequirements"
              placeholder="# Special Requirements&#10;&#10;- Only target US-based companies&#10;- Avoid competitors: Acme, BigCorp&#10;- Must have minimum 50 employees&#10;- No healthcare clients (compliance issues)&#10;- ..."
              value={context?.specialRequirements || ''}
              onChange={(e) => updateField('specialRequirements', e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Transcript Notes with Extract ICP button */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="text-green-600" size={16} />
                </div>
                Transcript Notes
              </CardTitle>
              <Button
                onClick={extractICP}
                disabled={extracting || !context?.transcriptNotes || context.transcriptNotes.trim().length < 50}
                variant="outline"
                className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100"
              >
                {extracting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="text-purple-500" size={16} />
                    Extract ICP
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="transcriptNotes" className="text-sm text-gray-600 mb-2 block">
                Paste Fathom/Fireflies transcripts here, then click "Extract ICP" to auto-populate
              </Label>
              <Textarea
                id="transcriptNotes"
                placeholder="# From Onboarding Call&#10;&#10;Paste your call transcript here...&#10;&#10;The AI will analyze the transcript and extract:&#10;- Target titles (VP Sales, Director of Revenue...)&#10;- Company sizes (50-200, 200-500...)&#10;- Industries (SaaS, FinTech...)&#10;- Geography (US, Canada...)&#10;- Pain points&#10;- Budget & timeline&#10;- Key quotes"
                value={context?.transcriptNotes || ''}
                onChange={(e) => updateField('transcriptNotes', e.target.value)}
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
            
            {/* Error message */}
            {extractError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {extractError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ICP Preview - shows when extraction is complete */}
        {extractedICP && (
          <ICPPreview
            data={extractedICP}
            onApply={applyExtractedICP}
            onDismiss={() => setExtractedICP(null)}
          />
        )}

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={saveContext} 
            disabled={saving}
            size="lg"
            className={saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Save size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client Context</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all context for "{context?.clientName || clientId}"? 
              This will remove ICP summary, special requirements, and transcript notes. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Context
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
