'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Mail, Clock } from 'lucide-react'

interface Communication {
  id: string
  clientName: string
  clientId: string
  platform: 'instantly' | 'bison'
  leadEmail: string
  replySnippet: string
  fullReply: string
  timestamp: string
  sentiment: 'interested' | 'not_interested' | 'question' | 'auto_reply'
}

interface CommunicationsFeedProps {
  communications: Communication[]
  loading?: boolean
}

function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getSentimentBadge(sentiment: Communication['sentiment']) {
  const config = {
    interested: { label: 'Interested', className: 'bg-green-100 text-green-700 border-green-200' },
    not_interested: { label: 'Not Interested', className: 'bg-red-100 text-red-700 border-red-200' },
    question: { label: 'Question', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    auto_reply: { label: 'Auto-reply', className: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
  return config[sentiment]
}

function getPlatformBadge(platform: 'instantly' | 'bison') {
  const config = {
    instantly: { label: 'Instantly', className: 'bg-blue-500 text-white' },
    bison: { label: 'Bison', className: 'bg-amber-500 text-white' }
  }
  return config[platform]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function CommunicationSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-gray-100 rounded" />
            <div className="h-12 w-full bg-gray-50 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CommunicationItem({ communication }: { communication: Communication }) {
  const [expanded, setExpanded] = useState(false)
  const sentiment = getSentimentBadge(communication.sentiment)
  const platform = getPlatformBadge(communication.platform)
  const hasMore = communication.fullReply.length > communication.replySnippet.length

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Client Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {getInitials(communication.clientName)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 truncate">
                {communication.clientName}
              </span>
              <Badge className={`text-xs ${platform.className}`}>
                {platform.label}
              </Badge>
              <Badge variant="outline" className={`text-xs ${sentiment.className}`}>
                {sentiment.label}
              </Badge>
            </div>

            {/* Lead Email */}
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <Mail size={12} />
              <span className="truncate">{communication.leadEmail}</span>
            </div>

            {/* Reply Content */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              {expanded ? communication.fullReply : communication.replySnippet}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} />
                {getRelativeTime(communication.timestamp)}
              </div>
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-gray-500 hover:text-gray-700 h-6 px-2"
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={14} className="mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} className="mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CommunicationsFeed({ communications, loading }: CommunicationsFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <CommunicationSkeleton />
        <CommunicationSkeleton />
        <CommunicationSkeleton />
        <CommunicationSkeleton />
      </div>
    )
  }

  if (communications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Mail className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No communications found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your filters or check back later
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {communications.map((communication) => (
        <CommunicationItem key={communication.id} communication={communication} />
      ))}
    </div>
  )
}
