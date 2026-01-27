'use client'

import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  FileText,
  BarChart3,
  Target,
  Trophy,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Circle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const mockUser = {
  name: 'Sarah Johnson',
  email: 'sarah@company.com',
  role: 'strategist'
}

const mockMetrics = {
  totalSubmissions: 18,
  passRate: 72,
  pending: 3,
  rank: 3,
  totalTeam: 8
}

const mockSubmissions = [
  {
    id: '1',
    clientName: 'Acme Corp',
    status: 'changes_requested',
    score: 89,
    submittedAt: '6 hours ago',
    reviewNotes: 'Fix email 2 spam score & lead list',
  },
  {
    id: '2',
    clientName: 'StartupXYZ',
    status: 'changes_requested',
    score: 78,
    submittedAt: 'Yesterday',
    reviewNotes: 'Loom needs sequence explanation',
  },
  {
    id: '3',
    clientName: 'TechFlow',
    status: 'approved',
    score: 91,
    approvedAt: 'Yesterday',
    reviewNotes: 'Great work on the ICP matching!'
  }
]

export default function DashboardPage() {
  const needsAction = mockSubmissions.filter(s => s.status === 'changes_requested')
  const recent = mockSubmissions.filter(s => s.status === 'approved')

  return (
    <div className="min-h-screen">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass-strong">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                  <Sparkles className="text-white" size={16} />
                </div>
                <span className="text-sm font-semibold text-gray-900">Strategist Portal</span>
              </div>

              <nav className="hidden md:flex items-center gap-1">
                <Link href="/" className="px-3 py-1.5 text-sm font-medium text-gray-900 rounded-lg bg-gray-100">
                  Dashboard
                </Link>
                <Link href="/submissions" className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  Submissions
                </Link>
                <Link href="/analytics" className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  Analytics
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-gray-500">Welcome back</p>
                <p className="text-sm font-semibold text-gray-900">{mockUser.name}</p>
              </div>
              <Button asChild size="default" className="shadow-lg">
                <Link href="/submissions/new">
                  <Plus size={16} />
                  New Submission
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 lg:px-12 py-12 space-y-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Submissions */}
          <div className="stat-card group">
            <div className="stat-card::before bg-blue-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center">
                  <FileText className="text-gray-700" size={18} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">30 days</span>
              </div>
              <div className="space-y-1">
                <p className="text-5xl font-semibold tracking-tight text-gray-900">
                  {mockMetrics.totalSubmissions}
                </p>
                <p className="text-sm font-medium text-gray-500">Submissions</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp size={12} strokeWidth={2.5} />
                  <span className="font-semibold">+3</span>
                </div>
                <span className="text-gray-400">this week</span>
              </div>
            </div>
          </div>

          {/* Pass Rate */}
          <div className="stat-card group">
            <div className="stat-card::before bg-emerald-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center">
                  <BarChart3 className="text-gray-700" size={18} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">+5%</span>
              </div>
              <div className="space-y-1">
                <p className="text-5xl font-semibold tracking-tight text-gray-900">
                  {mockMetrics.passRate}%
                </p>
                <p className="text-sm font-medium text-gray-500">Pass Rate</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                <Target size={12} className="text-gray-400" strokeWidth={2.5} />
                <span className="text-gray-400">Target: 80%</span>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="stat-card group">
            <div className="stat-card::before bg-amber-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center">
                  <Clock className="text-gray-700" size={18} strokeWidth={2} />
                </div>
                {mockMetrics.pending > 0 && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{mockMetrics.pending}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-5xl font-semibold tracking-tight text-gray-900">
                  {mockMetrics.pending}
                </p>
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                <Circle size={8} className="text-amber-500 fill-amber-500" />
                <span className="text-gray-400">Awaiting feedback</span>
              </div>
            </div>
          </div>

          {/* Team Rank */}
          <div className="stat-card group bg-gradient-to-br from-gray-900 to-gray-800 border-gray-800">
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Trophy className="text-amber-400" size={18} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Rank</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-semibold tracking-tight text-white">
                    #{mockMetrics.rank}
                  </p>
                  <p className="text-2xl font-medium text-gray-400">
                    /{mockMetrics.totalTeam}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-400">Team Position</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                <Sparkles size={12} className="text-amber-400" />
                <span className="text-gray-400">Top performer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Progress */}
        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardContent className="p-10 space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Your Goal Progress
                </h2>
                <p className="text-sm text-muted-foreground">
                  Reach 80% pass rate to unlock the next tier
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-semibold tracking-tight">90%</p>
                <p className="text-xs text-muted-foreground mt-1">to goal</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-900 to-gray-700 rounded-full transition-all duration-1000"
                  style={{ width: '90%' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Current: {mockMetrics.passRate}%</span>
                <span className="font-semibold">Target: 80%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Needed */}
        {needsAction.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Action Needed</h2>
                <p className="text-sm text-gray-500">{needsAction.length} submission{needsAction.length !== 1 ? 's' : ''} requiring attention</p>
              </div>
            </div>

            <div className="space-y-4">
              {needsAction.map((submission, idx) => (
                <Card
                  key={submission.id}
                  className="shadow-soft hover:shadow-medium transition-shadow border-l-2 border-red-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {submission.clientName}
                          </h3>
                          <Badge variant="destructive" className="gap-1.5">
                            <AlertCircle size={12} strokeWidth={2.5} />
                            Needs Revision
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>Submitted {submission.submittedAt}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="font-medium text-gray-700">Score: {submission.score}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-900">
                        Feedback from Jay
                      </p>
                      <p className="text-sm text-red-800 leading-relaxed">
                        {submission.reviewNotes}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button asChild className="flex-1 shadow-lg">
                      <Link href={`/submissions/${submission.id}`}>
                        View Details
                        <ArrowUpRight size={14} strokeWidth={2.5} />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={`/submissions/${submission.id}/edit`}>
                        Submit Revision
                      </Link>
                    </Button>
                  </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Approvals */}
        {recent.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Recent Approvals</h2>
                <p className="text-sm text-gray-500">Your latest successful submissions</p>
              </div>
              <Link
                href="/submissions"
                className="group flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                View All
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </Link>
            </div>

            <div className="grid gap-4">
              {recent.map((submission, idx) => (
                <Card
                  key={submission.id}
                  className="shadow-soft hover:shadow-medium transition-shadow border-l-2 border-emerald-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {submission.clientName}
                        </h3>
                        <Badge variant="secondary" className="gap-1.5 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                          Approved
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>Approved {submission.approvedAt}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="font-medium text-gray-700">Score: {submission.score}%</span>
                      </div>
                    </div>
                  </div>

                  {submission.reviewNotes && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                        Jay's feedback
                      </p>
                      <p className="text-sm text-emerald-800">
                        {submission.reviewNotes}
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/submissions/${submission.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
                  >
                    View Details
                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.5} />
                  </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Areas */}
        <Card className="shadow-soft hover:shadow-medium transition-shadow bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-amber-200/60">
          <CardContent className="p-10 space-y-6">
          <div>
            <h2 className="section-title">Areas to Improve</h2>
            <p className="text-sm text-gray-500">Focus on these to reach your 80% goal</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-amber-200/60 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Target className="text-amber-600" size={18} strokeWidth={2} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-900">Lead List ICP Matching</p>
                  <p className="text-sm text-gray-500">61% success (team avg: 82%)</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: '61%' }}></div>
                </div>
                <p className="text-xs text-gray-500">21% below team average</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-amber-200/60 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="text-amber-600" size={18} strokeWidth={2} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-900">Email Spam Scores</p>
                  <p className="text-sm text-gray-500">74% pass rate (team avg: 87%)</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: '74%' }}></div>
                </div>
                <p className="text-xs text-gray-500">13% below team average</p>
              </div>
            </div>
          </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
