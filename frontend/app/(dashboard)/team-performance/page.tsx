'use client'

import { Header } from '@/components/layout/Header'
import { TeamPerformanceDashboard } from '@/components/team-performance/TeamPerformanceDashboard'

export default function TeamPerformancePage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Team Performance"
        description="Track and measure team performance across all outreach platforms"
      />

      <div className="p-8">
        <TeamPerformanceDashboard />
      </div>
    </div>
  )
}
