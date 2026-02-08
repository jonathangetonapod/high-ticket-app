'use client'

import { useState, useRef, useEffect } from 'react'
import {
  FileText,
  Loader2,
  Search,
  Info,
  CheckCircle,
  Mail,
  Target,
  X,
  ChevronDown,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Client, Campaign, CampaignDetails, ValidationResult, getStatusBadge } from './types'

interface ClientCampaignSelectorProps {
  clients: Client[]
  campaigns: Campaign[]
  loadingClients: boolean
  loadingCampaigns: boolean
  selectedCampaignIds: string[]
  selectedCampaignsDetails: CampaignDetails[]
  loadingCampaignDetails: boolean
  formData: {
    clientId: string
    clientName: string
    platform: string
    workspaceId: string
    fathomMeetingId: string
    strategyTranscript: string
    intakeFormUrl: string
    selectedThreadId: string
    threadMessages: any[]
  }
  onClientSelect: (clientId: string) => void
  onCampaignToggle: (campaignId: string) => void
  onRemoveCampaign: (campaignId: string) => void
  onFormDataChange: (updates: Partial<ClientCampaignSelectorProps['formData']>) => void
  validation: ValidationResult
  onValidate: () => void
  getValidationCard: (validation: ValidationResult) => React.ReactNode
}

export function ClientCampaignSelector({
  clients,
  campaigns,
  loadingClients,
  loadingCampaigns,
  selectedCampaignIds,
  selectedCampaignsDetails,
  loadingCampaignDetails,
  formData,
  onClientSelect,
  onCampaignToggle,
  onRemoveCampaign,
  onFormDataChange,
  validation,
  onValidate,
  getValidationCard
}: ClientCampaignSelectorProps) {
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('')
  const [gmailSearchQuery, setGmailSearchQuery] = useState('')
  const [loadingGmailSearch, setLoadingGmailSearch] = useState(false)
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCampaignDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchGmailEmails = async () => {
    if (!gmailSearchQuery.trim()) return

    try {
      setLoadingGmailSearch(true)

      const ninetyDaysAgo = new Date(Date.now() - 90*24*60*60*1000).toISOString().split('T')[0].replace(/-/g, '/')
      const queryWithDateFilter = `${gmailSearchQuery} after:${ninetyDaysAgo}`

      const response = await fetch(`/api/gmail/search?query=${encodeURIComponent(queryWithDateFilter)}&maxResults=10`)
      const data = await response.json()

      if (data.success && data.results.length > 0) {
        const firstThreadId = data.results[0].thread_id
        await loadEmailThreadSilently(firstThreadId)
      } else {
        console.error('No emails found')
      }
    } catch (error) {
      console.error('Error searching emails:', error)
    } finally {
      setLoadingGmailSearch(false)
    }
  }

  const loadEmailThreadSilently = async (threadId: string) => {
    try {
      const response = await fetch(`/api/gmail/thread?threadId=${threadId}`)
      const data = await response.json()

      if (data.success) {
        onFormDataChange({
          selectedThreadId: threadId,
          threadMessages: data.messages
        })
      } else {
        console.error('Failed to load thread:', data.error)
      }
    } catch (error) {
      console.error('Error loading thread:', error)
    }
  }

  // Get unselected campaigns for the dropdown
  const availableCampaigns = campaigns.filter(c => !selectedCampaignIds.includes(c.id))
  const filteredAvailableCampaigns = availableCampaigns.filter(c => 
    c.name.toLowerCase().includes(campaignSearchQuery.toLowerCase())
  )

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText size={20} className="text-gray-700" />
          </div>
          Client & Campaign Selection
        </CardTitle>
        <CardDescription>
          Select the client and the campaigns being submitted for delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId">Select Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={onClientSelect}
              disabled={loadingClients}
              onOpenChange={(open) => !open && setClientSearchQuery('')}
            >
              <SelectTrigger id="clientId">
                <SelectValue placeholder={loadingClients ? "Loading clients..." : "Choose a client..."} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto bg-white z-50">
                {loadingClients ? (
                  <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} />
                    Loading...
                  </div>
                ) : clients.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No clients found
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 bg-white p-2 border-b z-10">
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search clients..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="pl-7 h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {clients
                      .filter((client) =>
                        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        client.platform.toLowerCase().includes(clientSearchQuery.toLowerCase())
                      )
                      .map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.platform})
                        </SelectItem>
                      ))}
                    {clients.filter((client) =>
                      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                      client.platform.toLowerCase().includes(clientSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No clients match your search
                      </div>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
            {formData.clientId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info size={12} />
                Platform: {formData.platform} • Workspace: {formData.workspaceId}
              </p>
            )}
          </div>

          {/* Multi-Campaign Selection - Shown after client is selected */}
          {formData.clientId && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Target size={14} />
                Select Campaigns for Delivery *
              </Label>

              {/* Selected Campaigns List */}
              {selectedCampaignsDetails.length > 0 && (
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Selected Campaigns for Delivery ({selectedCampaignsDetails.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedCampaignsDetails.map((campaign) => {
                        const statusBadge = getStatusBadge(campaign.status || 'unknown')
                        return (
                          <div
                            key={campaign.campaign_id}
                            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle size={16} className="text-emerald-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {campaign.campaign_name}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.color}`}>
                                {statusBadge.icon} {statusBadge.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {campaign.sequences.length} emails
                              </span>
                            </div>
                            <button
                              onClick={() => onRemoveCampaign(campaign.campaign_id)}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove campaign"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Campaign Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
                  disabled={loadingCampaigns || availableCampaigns.length === 0}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={16} />
                    {loadingCampaigns 
                      ? "Loading campaigns..." 
                      : availableCampaigns.length === 0 
                        ? selectedCampaignIds.length > 0 
                          ? "All campaigns selected"
                          : "No campaigns found" 
                        : "Add Campaign"
                    }
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${campaignDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>

                {campaignDropdownOpen && availableCampaigns.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-hidden">
                    {/* Search within dropdown */}
                    <div className="p-2 border-b sticky top-0 bg-white">
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search campaigns..."
                          value={campaignSearchQuery}
                          onChange={(e) => setCampaignSearchQuery(e.target.value)}
                          className="pl-7 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Campaign list */}
                    <div className="overflow-y-auto max-h-[240px]">
                      {loadingCampaignDetails && (
                        <div className="p-2 text-sm text-blue-600 flex items-center gap-2 bg-blue-50 border-b">
                          <Loader2 className="animate-spin" size={14} />
                          Loading campaign details...
                        </div>
                      )}
                      
                      {filteredAvailableCampaigns.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No campaigns match your search
                        </div>
                      ) : (
                        filteredAvailableCampaigns.map((campaign) => {
                          const statusBadge = getStatusBadge(campaign.status || 'unknown')
                          return (
                            <button
                              key={campaign.id}
                              onClick={() => {
                                onCampaignToggle(campaign.id)
                                setCampaignSearchQuery('')
                              }}
                              disabled={loadingCampaignDetails}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed border-b last:border-b-0"
                            >
                              <span className="text-sm text-gray-900">{campaign.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.color}`}>
                                {statusBadge.icon} {statusBadge.label}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info size={12} />
                Select one or more campaigns to include in this delivery review
              </p>
            </div>
          )}

          {/* Campaign Details Loading/Loaded Summary */}
          {selectedCampaignIds.length > 0 && (
            <Card className={`${
              loadingCampaignDetails 
                ? 'bg-blue-50 border-blue-200' 
                : selectedCampaignsDetails.length === selectedCampaignIds.length 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-amber-50 border-amber-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {loadingCampaignDetails ? (
                    <>
                      <Loader2 className="animate-spin text-blue-600" size={20} />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Loading campaign details...</p>
                        <p className="text-xs text-blue-700">Fetching email sequences and configuration</p>
                      </div>
                    </>
                  ) : selectedCampaignsDetails.length === selectedCampaignIds.length ? (
                    <>
                      <CheckCircle size={20} className="text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900">
                          {selectedCampaignsDetails.length} campaign{selectedCampaignsDetails.length !== 1 ? 's' : ''} ready
                        </p>
                        <p className="text-xs text-emerald-700">
                          Total: {selectedCampaignsDetails.reduce((sum, c) => sum + c.sequences.length, 0)} email sequences ready for review in Tab 3
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Info size={20} className="text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">Some campaigns failed to load</p>
                        <p className="text-xs text-amber-700">Please try selecting the campaigns again</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gmail Search */}
          {formData.clientId && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Search Client Email Threads</p>
                      <p className="text-sm text-gray-700">
                        Search Jay's Gmail for emails with {formData.clientName} to find strategy call discussions, intake forms, and campaign details
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={gmailSearchQuery}
                          onChange={(e) => setGmailSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchGmailEmails()}
                          placeholder={`Search: from:${formData.clientName.toLowerCase().replace(/\s+/g, '')}@...`}
                          className="pl-9 bg-white"
                        />
                      </div>
                      <Button
                        onClick={searchGmailEmails}
                        disabled={loadingGmailSearch || !gmailSearchQuery.trim()}
                        className="shadow-sm"
                      >
                        {loadingGmailSearch ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Search size={16} />
                        )}
                      </Button>
                    </div>

                    {loadingGmailSearch && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                        <p className="text-sm text-gray-600 ml-3">Loading client context...</p>
                      </div>
                    )}

                    {!loadingGmailSearch && formData.selectedThreadId && (
                      <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle size={20} className="text-emerald-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-emerald-900">
                                Client context loaded successfully
                              </p>
                              <p className="text-xs text-emerald-700 mt-0.5">
                                {formData.threadMessages.length} email messages captured for AI validation
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional fields */}
          <div className="space-y-2">
            <Label htmlFor="fathomMeetingId">Fathom Meeting ID (Optional)</Label>
            <Input
              id="fathomMeetingId"
              value={formData.fathomMeetingId}
              onChange={(e) => onFormDataChange({ fathomMeetingId: e.target.value })}
              placeholder="e.g., abc-123-xyz"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info size={12} />
              If you have a Fathom recording link, add it here
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategyTranscript">Strategy Call Transcript (Optional)</Label>
            <Textarea
              id="strategyTranscript"
              value={formData.strategyTranscript}
              onChange={(e) => onFormDataChange({ strategyTranscript: e.target.value })}
              placeholder="Paste the full strategy call transcript here..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info size={12} />
              Paste the complete transcript from the strategy call
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intakeFormUrl">Intake Form URL (Optional)</Label>
            <Input
              id="intakeFormUrl"
              type="url"
              value={formData.intakeFormUrl}
              onChange={(e) => onFormDataChange({ intakeFormUrl: e.target.value })}
              placeholder="https://docs.google.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Google Doc or form link with additional client details
            </p>
          </div>
        </div>

        {getValidationCard(validation)}
      </CardContent>
    </Card>
  )
}
