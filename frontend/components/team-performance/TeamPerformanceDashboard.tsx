'use client'

import { useState, useEffect } from 'react'
import { TimeRangeSelector, TimeRange } from './TimeRangeSelector'
import { PerformanceMetrics } from './PerformanceMetrics'
import { PerformanceTrends } from './PerformanceTrends'
import { StrategistLeaderboard } from './StrategistLeaderboard'
import { CommunicationHealth } from './CommunicationHealth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

export interface TeamPerformanceData {
  metrics: {
    totalEmailsSent: number
    openRate: number
    replyRate: number
    positiveReplyRate: number
    meetingsBooked: number
    campaignsLaunched: number
  }
  trends: {
    date: string
    emailsSent: number
    openRate: number
    replyRate: number
    positiveReplies: number
    meetingsBooked: number
  }[]
  previousPeriodComparison: {
    emailsSent: number
    openRate: number
    replyRate: number
    positiveReplyRate: number
    meetingsBooked: number
    campaignsLaunched: number
  }
  strategists: {
    id: string
    name: string
    campaignsHandled: number
    approvalRate: number
    avgLaunchTime: number
    totalEmailsSent: number
    positiveReplies: number
  }[]
  communicationHealth: {
    avgResponseTime: number
    responseTimeGoal: number
    outstandingMessages: number
    slackActivity: number
    clientsWithPendingReplies: string[]
  }
  platforms: {
    instantly: {
      emailsSent: number
      openRate: number
      replyRate: number
      campaigns: number
    }
    bison: {
      emailsSent: number
      openRate: number
      replyRate: number
      campaigns: number
    }
  }
  lastUpdated: string
}

export function TeamPerformanceDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    preset: '30d',
    startDate: null,
    endDate: null
  })
  const [data, setData] = useState<TeamPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(!forceRefresh)
      setRefreshing(forceRefresh)
      setError(null)

      const params = new URLSearchParams()
      if (timeRange.preset) {
        params.set('preset', timeRange.preset)
      } else if (timeRange.startDate && timeRange.endDate) {
        params.set('startDate', timeRange.startDate)
        params.set('endDate', timeRange.endDate)
      }
      if (forceRefresh) {
        params.set('refresh', 'true')
      }

      const response = await fetch(`/api/team-performance?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch performance data')
      }

      setData(result.data)
    } catch (err: unknown) {
      console.error('Error fetching team performance:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const handleExport = () => {
    if (!data) return
    
    const exportData = {
      exportDate: new Date().toISOString(),
      timeRange,
      ...data
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-performance-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!data}
          >
            <Download size={16} />
            <span className="ml-2">Export</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Failed to load performance data</p>
          <p className="text-sm mt-1">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchData()} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      <PerformanceMetrics
        metrics={data?.metrics}
        comparison={data?.previousPeriodComparison}
        platforms={data?.platforms}
        loading={loading}
      />

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="strategists">Team Leaderboard</TabsTrigger>
          <TabsTrigger value="health">Communication Health</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <PerformanceTrends
            trends={data?.trends || []}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="strategists">
          <StrategistLeaderboard
            strategists={data?.strategists || []}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="health">
          <CommunicationHealth
            health={data?.communicationHealth}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {data?.lastUpdated && (
        <p className="text-xs text-gray-500 text-center">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  )
}
