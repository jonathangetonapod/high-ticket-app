'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

// Mock data - would come from API
const mockSubmission = {
  id: '1',
  clientName: 'Acme Corp',
  strategist: 'Sarah Johnson',
  status: 'changes_requested',
  overallScore: 89,
  criteriaMet: 24,
  criteriaTotal: 27,
  submittedAt: '2026-01-27T09:42:00Z',
  reviewedAt: '2026-01-27T13:20:00Z',
  reviewer: 'Jay',
  reviewNotes: 'Great work overall! Please fix:\n1. Email 2: Replace "free trial" with "trial included" and remove "limited time"\n2. Remove 23 flagged leads or provide rationale\n3. Re-record Loom explaining why 3 emails\n\nResubmit once fixed.',

  phase1: {
    name: 'Strategy Call Reference',
    score: 100,
    pass: true,
    checks: [
      { name: 'Transcript exists', pass: true, detail: 'Fathom call: 47 minutes' },
      { name: 'Call duration adequate', pass: true, detail: '47 min (minimum 30 min)' },
      { name: 'ICP extracted', pass: true, detail: 'VP/Director Sales, B2B SaaS, 50-500 employees' },
      { name: 'Pain points identified', pass: true, detail: 'Manual workflows, compliance overhead' }
    ]
  },

  phase2: {
    name: 'Infrastructure',
    score: 92,
    pass: true,
    checks: [
      { name: 'Mailbox health', pass: true, detail: 'Excellent (89/100)' },
      { name: 'Warmup complete', pass: true, detail: '234 emails sent' },
      { name: 'Daily limits configured', pass: false, detail: 'Set to 500 (recommend max 200)', warning: true },
      { name: 'Stop on reply enabled', pass: true, detail: 'Enabled' },
      { name: 'Tracking enabled', pass: true, detail: 'Link and open tracking active' }
    ]
  },

  phase3: {
    name: 'Lead List',
    score: 82,
    pass: false,
    checks: [
      { name: 'Total leads', pass: true, detail: '2,847 leads' },
      { name: 'Required fields populated', pass: true, detail: 'All fields complete' },
      { name: 'ICP match rate', pass: false, detail: '82% match (need 85%+). 23 leads flagged' },
      { name: 'No consumer emails', pass: true, detail: 'All business emails' },
      { name: 'No duplicates', pass: true, detail: 'No duplicates found' }
    ]
  },

  phase4: {
    name: 'Email Copy',
    score: 74,
    pass: false,
    checks: [
      { name: 'Email 1 - Spam score', pass: true, detail: '2.1/10 (Good)' },
      { name: 'Email 1 - Quality', pass: true, detail: '9/10 - Excellent' },
      { name: 'Email 2 - Spam score', pass: false, detail: '7.8/10 (High). Trigger words: "free trial", "limited time"' },
      { name: 'Email 2 - Quality', pass: false, detail: '6/10 - Needs improvement' },
      { name: 'Email 3 - Spam score', pass: true, detail: '3.4/10 (Good)' },
      { name: 'Email 3 - Quality', pass: true, detail: '8/10 - Good' },
      { name: 'Personalization', pass: true, detail: 'All emails use {{firstName}}, {{company}}' }
    ]
  },

  phase5: {
    name: 'Loom Explanation',
    score: 80,
    pass: false,
    checks: [
      { name: 'Video duration', pass: true, detail: '4 min 32 sec' },
      { name: 'ICP explanation', pass: true, detail: 'Clearly explained targeting logic' },
      { name: 'Copy strategy', pass: true, detail: 'Explained pain points approach' },
      { name: 'Sequence rationale', pass: false, detail: 'Did not explain why 3 emails vs 5' },
      { name: 'Strategy call references', pass: true, detail: 'Referenced call multiple times' }
    ]
  }
}

export default function SubmissionDetailPage() {
  const phases = [
    mockSubmission.phase1,
    mockSubmission.phase2,
    mockSubmission.phase3,
    mockSubmission.phase4,
    mockSubmission.phase5
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle size={16} />
            Needs Revision
          </span>
        )
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock size={16} />
            Pending Review
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle size={16} />
            Approved
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={24} />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {mockSubmission.clientName}
                </h1>
                {getStatusBadge(mockSubmission.status)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Submitted {new Date(mockSubmission.submittedAt).toLocaleDateString()} by {mockSubmission.strategist}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Validation Score</h2>
            <div className="text-4xl font-bold text-gray-900">
              {mockSubmission.overallScore}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all ${
                mockSubmission.overallScore >= 90 ? 'bg-green-500' :
                mockSubmission.overallScore >= 80 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${mockSubmission.overallScore}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {mockSubmission.criteriaMet} of {mockSubmission.criteriaTotal} criteria met
          </p>
        </div>

        {/* Review Feedback */}
        {mockSubmission.status === 'changes_requested' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <MessageSquare className="text-red-600 flex-shrink-0 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">
                  Review from {mockSubmission.reviewer}
                </h3>
                <p className="text-sm text-red-800 whitespace-pre-line">
                  {mockSubmission.reviewNotes}
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/submissions/${mockSubmission.id}/edit`}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Submit Revision
                  </Link>
                  <button className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                    Ask Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase Results */}
        <div className="space-y-6">
          {phases.map((phase, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Phase Header */}
              <div className={`p-4 flex items-center justify-between ${
                phase.pass ? 'bg-green-50 border-b-2 border-green-500' :
                phase.score >= 80 ? 'bg-yellow-50 border-b-2 border-yellow-500' :
                'bg-red-50 border-b-2 border-red-500'
              }`}>
                <div className="flex items-center gap-3">
                  {phase.pass ? (
                    <CheckCircle className="text-green-600" size={24} />
                  ) : phase.score >= 80 ? (
                    <AlertTriangle className="text-yellow-600" size={24} />
                  ) : (
                    <XCircle className="text-red-600" size={24} />
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Phase {idx + 1}: {phase.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Score: {phase.score}%
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  phase.pass ? 'bg-green-200 text-green-800' :
                  phase.score >= 80 ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {phase.pass ? 'Passed' : phase.score >= 80 ? 'Warning' : 'Failed'}
                </div>
              </div>

              {/* Checks */}
              <div className="p-6">
                <div className="space-y-3">
                  {phase.checks.map((check, checkIdx) => (
                    <div
                      key={checkIdx}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        check.pass
                          ? 'bg-green-50'
                          : check.warning
                          ? 'bg-yellow-50'
                          : 'bg-red-50'
                      }`}
                    >
                      {check.pass ? (
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                      ) : check.warning ? (
                        <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                      ) : (
                        <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {check.name}
                        </p>
                        <p className={`text-sm mt-1 ${
                          check.pass
                            ? 'text-green-700'
                            : check.warning
                            ? 'text-yellow-700'
                            : 'text-red-700'
                        }`}>
                          {check.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={20} />
            Export PDF Report
          </button>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <ExternalLink size={20} />
            View Campaign
          </button>
        </div>
      </main>
    </div>
  )
}
