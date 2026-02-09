'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Trophy, Medal, Clock, CheckCircle, Mail, ThumbsUp } from 'lucide-react'
import { TeamPerformanceData } from './TeamPerformanceDashboard'

interface StrategistLeaderboardProps {
  strategists: TeamPerformanceData['strategists']
  loading?: boolean
}

function LeaderboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="text-yellow-500" size={24} />
    case 2:
      return <Medal className="text-gray-400" size={22} />
    case 3:
      return <Medal className="text-amber-600" size={20} />
    default:
      return (
        <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-medium">
          {rank}
        </span>
      )
  }
}

function getRankBg(rank: number) {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-slate-100 border border-gray-200'
    case 3:
      return 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
    default:
      return 'bg-gray-50'
  }
}

export function StrategistLeaderboard({ strategists, loading }: StrategistLeaderboardProps) {
  if (loading) {
    return <LeaderboardSkeleton />
  }

  if (strategists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No strategist data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedStrategists = [...strategists].sort((a, b) => 
    b.positiveReplies - a.positiveReplies || b.totalEmailsSent - a.totalEmailsSent
  )

  const maxEmails = Math.max(...strategists.map(s => s.totalEmailsSent))
  const maxPositive = Math.max(...strategists.map(s => s.positiveReplies))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            Team Leaderboard
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Ranked by Positive Replies
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedStrategists.map((strategist, index) => {
          const rank = index + 1
          const emailProgress = (strategist.totalEmailsSent / maxEmails) * 100
          const positiveProgress = maxPositive > 0 ? (strategist.positiveReplies / maxPositive) * 100 : 0

          return (
            <div
              key={strategist.id}
              className={`p-4 rounded-lg transition-all hover:shadow-md ${getRankBg(rank)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {strategist.name}
                    </h4>
                    {rank <= 3 && (
                      <Badge 
                        variant="outline" 
                        className={
                          rank === 1 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          rank === 2 ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }
                      >
                        {rank === 1 ? 'Top Performer' : rank === 2 ? 'Runner Up' : '3rd Place'}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Mail size={12} />
                        Emails Sent
                      </div>
                      <p className="font-semibold">{strategist.totalEmailsSent.toLocaleString()}</p>
                      <Progress value={emailProgress} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <ThumbsUp size={12} />
                        Positive Replies
                      </div>
                      <p className="font-semibold text-green-600">{strategist.positiveReplies}</p>
                      <Progress value={positiveProgress} className="h-1 mt-1 [&>div]:bg-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <CheckCircle size={12} />
                        Campaigns
                      </div>
                      <p className="font-semibold">{strategist.campaignsHandled}</p>
                      <p className="text-xs text-gray-400">{strategist.approvalRate.toFixed(0)}% approved</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Clock size={12} />
                        Avg Launch Time
                      </div>
                      <p className="font-semibold">
                        {strategist.avgLaunchTime < 24 
                          ? `${strategist.avgLaunchTime.toFixed(0)}h`
                          : `${(strategist.avgLaunchTime / 24).toFixed(1)}d`
                        }
                      </p>
                      <p className="text-xs text-gray-400">from approval</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
