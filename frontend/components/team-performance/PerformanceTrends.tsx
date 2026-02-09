'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { TeamPerformanceData } from './TeamPerformanceDashboard'

interface PerformanceTrendsProps {
  trends: TeamPerformanceData['trends']
  loading?: boolean
}

type MetricType = 'emailsSent' | 'openRate' | 'replyRate' | 'positiveReplies' | 'meetingsBooked'

const metricConfig: Record<MetricType, { label: string; color: string; suffix: string }> = {
  emailsSent: { label: 'Emails Sent', color: '#3b82f6', suffix: '' },
  openRate: { label: 'Open Rate', color: '#8b5cf6', suffix: '%' },
  replyRate: { label: 'Reply Rate', color: '#06b6d4', suffix: '%' },
  positiveReplies: { label: 'Positive Replies', color: '#22c55e', suffix: '' },
  meetingsBooked: { label: 'Meetings Booked', color: '#f59e0b', suffix: '' }
}

export function PerformanceTrends({ trends, loading }: PerformanceTrendsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('emailsSent')
  const [chartType] = useState<'line' | 'area'>('area')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            No trend data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  const formattedTrends = trends.map(t => ({
    ...t,
    displayDate: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }))

  const config = metricConfig[selectedMetric]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Performance Trends</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(metricConfig) as MetricType[]).map((metric) => (
                <Button
                  key={metric}
                  variant={selectedMetric === metric ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric(metric)}
                  className="text-xs"
                >
                  {metricConfig[metric].label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={formattedTrends}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  tickFormatter={(value) => `${value}${config.suffix}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()}${config.suffix}`, config.label]}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={config.color}
                  strokeWidth={2}
                  fill="url(#colorMetric)"
                />
              </AreaChart>
            ) : (
              <LineChart data={formattedTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  tickFormatter={(value) => `${value}${config.suffix}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()}${config.suffix}`, config.label]}
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={{ fill: config.color, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: config.color }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-500">Period Average</p>
            <p className="text-lg font-semibold">
              {(trends.reduce((sum, t) => sum + (t[selectedMetric] as number), 0) / trends.length).toFixed(1)}
              {config.suffix}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Peak</p>
            <p className="text-lg font-semibold text-green-600">
              {Math.max(...trends.map(t => t[selectedMetric] as number)).toLocaleString()}
              {config.suffix}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Low</p>
            <p className="text-lg font-semibold text-amber-600">
              {Math.min(...trends.map(t => t[selectedMetric] as number)).toLocaleString()}
              {config.suffix}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Data Points</p>
            <p className="text-lg font-semibold">{trends.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
