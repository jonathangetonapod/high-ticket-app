'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Hash,
  Users,
  AlertCircle
} from 'lucide-react'
import { TeamPerformanceData } from './TeamPerformanceDashboard'

interface CommunicationHealthProps {
  health?: TeamPerformanceData['communicationHealth']
  loading?: boolean
}

function HealthSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function getResponseTimeStatus(avgTime: number, goal: number) {
  const ratio = avgTime / goal
  if (ratio <= 0.5) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-100' }
  if (ratio <= 0.8) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-100' }
  if (ratio <= 1) return { status: 'on target', color: 'text-amber-600', bg: 'bg-amber-100' }
  return { status: 'needs improvement', color: 'text-red-600', bg: 'bg-red-100' }
}

export function CommunicationHealth({ health, loading }: CommunicationHealthProps) {
  if (loading) {
    return <HealthSkeleton />
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No communication data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const responseStatus = getResponseTimeStatus(health.avgResponseTime, health.responseTimeGoal)
  const responseProgress = Math.min((health.avgResponseTime / health.responseTimeGoal) * 100, 100)
  const invertedProgress = 100 - responseProgress

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock size={20} />
            Response Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-4">
            <div className="inline-flex items-baseline gap-2">
              <span className="text-5xl font-bold">{health.avgResponseTime.toFixed(1)}</span>
              <span className="text-xl text-gray-500">hours</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">average response time</p>
            <Badge className={`mt-3 ${responseStatus.bg} ${responseStatus.color} border-0`}>
              {responseStatus.status}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Progress to {health.responseTimeGoal}h goal</span>
              <span className={responseStatus.color}>
                {health.avgResponseTime <= health.responseTimeGoal ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle size={14} />
                    On Target
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {(health.avgResponseTime - health.responseTimeGoal).toFixed(1)}h over
                  </span>
                )}
              </span>
            </div>
            <Progress 
              value={invertedProgress} 
              className={`h-3 ${
                invertedProgress >= 50 ? '[&>div]:bg-green-500' :
                invertedProgress >= 20 ? '[&>div]:bg-amber-500' :
                '[&>div]:bg-red-500'
              }`}
            />
            <p className="text-xs text-gray-400 text-center">
              Lower response time = better performance
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {health.responseTimeGoal}h
              </p>
              <p className="text-xs text-gray-500">Target Goal</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${responseStatus.color}`}>
                {health.avgResponseTime <= health.responseTimeGoal 
                  ? `${(health.responseTimeGoal - health.avgResponseTime).toFixed(1)}h`
                  : `+${(health.avgResponseTime - health.responseTimeGoal).toFixed(1)}h`
                }
              </p>
              <p className="text-xs text-gray-500">
                {health.avgResponseTime <= health.responseTimeGoal ? 'Under Goal' : 'Over Goal'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare size={20} />
            Communication Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Hash size={16} className="text-blue-500" />
                <span className="text-sm text-gray-500">Slack Activity</span>
              </div>
              <p className="text-2xl font-bold">{health.slackActivity}</p>
              <p className="text-xs text-gray-400">messages this period</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              health.outstandingMessages > 0 ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {health.outstandingMessages > 0 ? (
                  <AlertCircle size={16} className="text-amber-500" />
                ) : (
                  <CheckCircle size={16} className="text-green-500" />
                )}
                <span className="text-sm text-gray-500">Outstanding</span>
              </div>
              <p className={`text-2xl font-bold ${
                health.outstandingMessages > 0 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {health.outstandingMessages}
              </p>
              <p className="text-xs text-gray-400">pending replies</p>
            </div>
          </div>

          {health.clientsWithPendingReplies.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users size={16} />
                Clients Awaiting Response
              </div>
              <div className="flex flex-wrap gap-2">
                {health.clientsWithPendingReplies.slice(0, 10).map((client) => (
                  <Badge
                    key={client}
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200"
                  >
                    {client}
                  </Badge>
                ))}
                {health.clientsWithPendingReplies.length > 10 && (
                  <Badge variant="outline" className="bg-gray-50">
                    +{health.clientsWithPendingReplies.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-gray-700">Health Tips</p>
            <div className="space-y-1.5">
              {health.avgResponseTime > health.responseTimeGoal && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Response time is above the 24h goal. Consider reviewing workload distribution.</span>
                </div>
              )}
              {health.outstandingMessages > 5 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Multiple clients have pending messages. Prioritize catching up on replies.</span>
                </div>
              )}
              {health.avgResponseTime <= health.responseTimeGoal && health.outstandingMessages <= 2 && (
                <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Great job! Communication health is excellent. Keep up the good work!</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
