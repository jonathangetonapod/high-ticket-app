'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SlackChannel, SlackMessage, ValidationResult } from './types'

interface SlackHistoryProps {
  clientId: string
  clientName: string
  selectedSlackChannel: string
  slackMessages: SlackMessage[]
  onSlackDataChange: (channelId: string, messages: SlackMessage[]) => void
  validation: ValidationResult
  onValidate: () => void
  getValidationCard: (validation: ValidationResult) => React.ReactNode
}

export function SlackHistory({
  clientId,
  clientName,
  selectedSlackChannel,
  slackMessages,
  onSlackDataChange,
  validation,
  onValidate,
  getValidationCard
}: SlackHistoryProps) {
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([])
  const [loadingSlackChannels, setLoadingSlackChannels] = useState(false)
  const [loadingSlackHistory, setLoadingSlackHistory] = useState(false)
  const [channelSearchQuery, setChannelSearchQuery] = useState('')

  const loadSlackChannels = async () => {
    try {
      setLoadingSlackChannels(true)
      const response = await fetch('/api/slack/channels')
      const data = await response.json()

      if (data.success) {
        setSlackChannels(data.channels)
      } else {
        console.error('Failed to load Slack channels:', data.error)
      }
    } catch (error) {
      console.error('Error loading Slack channels:', error)
    } finally {
      setLoadingSlackChannels(false)
    }
  }

  const loadSlackChannelHistory = async (channelId: string) => {
    try {
      setLoadingSlackHistory(true)
      const response = await fetch(`/api/slack/history?channel=${encodeURIComponent(channelId)}&limit=30d`)
      const data = await response.json()

      if (data.success) {
        onSlackDataChange(channelId, data.messages)
      } else {
        console.error('Failed to load Slack history:', data.error)
      }
    } catch (error) {
      console.error('Error loading Slack history:', error)
    } finally {
      setLoadingSlackHistory(false)
    }
  }

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(parseFloat(ts) * 1000)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ts
    }
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <MessageSquare size={20} className="text-purple-700" />
          </div>
          Slack Channel History
        </CardTitle>
        <CardDescription>
          Load Slack channel conversations to gather additional context about the client and campaign requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!clientId ? (
          <Card className="bg-amber-50/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  Please select a client in Step 1 first
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Channel Selection */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={20} className="text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Select Slack Channel</p>
                    <p className="text-sm text-gray-700">
                      Choose a channel to load conversation history for {clientName}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={selectedSlackChannel}
                        onValueChange={(channelId) => loadSlackChannelHistory(channelId)}
                        disabled={loadingSlackChannels || loadingSlackHistory}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder={loadingSlackChannels ? "Loading channels..." : "Select a Slack channel..."} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto bg-white z-50">
                          {loadingSlackChannels ? (
                            <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                              <Loader2 className="animate-spin" size={14} />
                              Loading...
                            </div>
                          ) : slackChannels.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No channels found - click "Load Channels" first
                            </div>
                          ) : (
                            slackChannels
                              .filter(channel =>
                                channel.name.toLowerCase().includes(channelSearchQuery.toLowerCase())
                              )
                              .map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  #{channel.name} ({channel.member_count} members)
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={loadSlackChannels}
                      disabled={loadingSlackChannels}
                      variant="outline"
                      className="shadow-sm bg-white"
                    >
                      {loadingSlackChannels ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        'Load Channels'
                      )}
                    </Button>
                  </div>

                  {/* Loading State */}
                  {loadingSlackHistory && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-purple-600" size={24} />
                      <p className="text-sm text-gray-600 ml-3">Loading channel history...</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {!loadingSlackHistory && selectedSlackChannel && slackMessages.length > 0 && (
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle size={20} className="text-emerald-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-emerald-900">
                              Slack channel loaded successfully
                            </p>
                            <p className="text-xs text-emerald-700 mt-0.5">
                              {slackMessages.length} messages from last 30 days captured for AI validation
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message Preview */}
            {selectedSlackChannel && slackMessages.length > 0 && (
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-900">
                      Channel Messages Preview
                    </p>
                    <span className="text-xs text-gray-500">
                      Showing {Math.min(slackMessages.length, 20)} of {slackMessages.length} messages
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {slackMessages.slice(0, 20).map((message, idx) => (
                      <div
                        key={message.ts || idx}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-purple-700">
                              {message.user?.substring(0, 2).toUpperCase() || '??'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-900">
                                {message.user || 'Unknown User'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(message.ts)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm text-blue-900">
                    <p className="font-medium">Why load Slack history?</p>
                    <ul className="text-blue-800 space-y-0.5 text-xs">
                      <li>• Capture additional context about client requirements</li>
                      <li>• Find discussions about ICP and targeting preferences</li>
                      <li>• Reference campaign change requests or updates</li>
                      <li>• Validate that deliverables match latest conversations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Button
          onClick={onValidate}
          disabled={!selectedSlackChannel || slackMessages.length === 0 || validation.status === 'validating'}
          className="w-full shadow-lg"
          size="lg"
        >
          {validation.status === 'validating' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Analyzing Slack Context...
            </>
          ) : (
            <>
              <MessageSquare size={20} />
              Validate Slack Context
            </>
          )}
        </Button>

        {getValidationCard(validation)}
      </CardContent>
    </Card>
  )
}
