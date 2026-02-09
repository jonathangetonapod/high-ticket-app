'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  FileText,
  Settings,
  Mail,
  Loader2,
  Send,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ValidationResult, ValidationStatus } from './types'

interface CampaignSummary {
  campaignId: string
  campaignName: string
  leadCount: number
  sequenceCount: number
}

interface ReviewSubmitProps {
  clientName: string
  platform: string
  campaigns: CampaignSummary[]
  validations: {
    clientCampaign: ValidationResult
    mailboxHealth: ValidationResult
    emailCopyLeads: ValidationResult
  }
  strategistNotes: string
  onNotesChange: (notes: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

const getStatusIcon = (status: ValidationStatus) => {
  switch (status) {
    case 'validating':
      return <Loader2 className="animate-spin text-blue-500" size={20} />
    case 'pass':
      return <CheckCircle className="text-emerald-500" size={20} />
    case 'fail':
      return <XCircle className="text-red-500" size={20} />
    case 'warning':
      return <AlertTriangle className="text-amber-500" size={20} />
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
  }
}

const getStatusLabel = (status: ValidationStatus) => {
  switch (status) {
    case 'validating':
      return 'Validating...'
    case 'pass':
      return 'Passed'
    case 'fail':
      return 'Failed'
    case 'warning':
      return 'Warning'
    default:
      return 'Not Started'
  }
}

const getStatusColor = (status: ValidationStatus) => {
  switch (status) {
    case 'validating':
      return 'bg-blue-50 border-blue-200 text-blue-700'
    case 'pass':
      return 'bg-emerald-50 border-emerald-200 text-emerald-700'
    case 'fail':
      return 'bg-red-50 border-red-200 text-red-700'
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-700'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-500'
  }
}

export function ReviewSubmit({
  clientName,
  platform,
  campaigns,
  validations,
  strategistNotes,
  onNotesChange,
  onSubmit,
  isSubmitting
}: ReviewSubmitProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const steps = [
    {
      key: 'clientCampaign',
      label: 'Client & Campaign Selection',
      icon: FileText,
      validation: validations.clientCampaign
    },
    {
      key: 'mailboxHealth',
      label: 'Mailbox Health Check',
      icon: Settings,
      validation: validations.mailboxHealth
    },
    {
      key: 'emailCopyLeads',
      label: 'Email Copy & Lead Lists',
      icon: Mail,
      validation: validations.emailCopyLeads
    }
  ]

  const completedCount = steps.filter(s => s.validation.status === 'pass').length
  const warningCount = steps.filter(s => s.validation.status === 'warning').length
  const failedCount = steps.filter(s => s.validation.status === 'fail').length
  const pendingCount = steps.length - completedCount - warningCount - failedCount
  
  // Require all 3 validations complete (pass or warning), no failures
  const allValidated = (completedCount + warningCount) === 3 && failedCount === 0
  const canSubmit = allValidated

  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadCount || 0), 0)
  const totalSequences = campaigns.reduce((sum, c) => sum + (c.sequenceCount || 0), 0)

  const toggleStep = (key: string) => {
    const next = new Set(expandedSteps)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setExpandedSteps(next)
  }

  const handleSubmitClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false)
    onSubmit()
  }

  return (
    <>
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Send size={20} className="text-gray-700" />
            </div>
            Review & Submit for Delivery
          </CardTitle>
          <CardDescription>
            Review all validations before submitting for delivery approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Summary */}
          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-slate-700">
                    {clientName?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{clientName || 'No client selected'}</h3>
                    <Badge variant="outline" className="text-xs">{platform || 'Unknown'}</Badge>
                  </div>
                  
                  {campaigns.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-slate-500" />
                        <div>
                          <div className="text-lg font-bold text-slate-900">{campaigns.length}</div>
                          <div className="text-xs text-slate-600">Campaign{campaigns.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-slate-500" />
                        <div>
                          <div className="text-lg font-bold text-slate-900">{totalLeads.toLocaleString()}</div>
                          <div className="text-xs text-slate-600">Total Leads</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-slate-500" />
                        <div>
                          <div className="text-lg font-bold text-slate-900">{totalSequences}</div>
                          <div className="text-xs text-slate-600">Email Sequences</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">No campaigns selected</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Summary Grid */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
                <div className="text-xs text-emerald-700 font-medium mt-1">Passed</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
                <div className="text-xs text-amber-700 font-medium mt-1">Warnings</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-xs text-red-700 font-medium mt-1">Failed</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{pendingCount}</div>
                <div className="text-xs text-gray-600 font-medium mt-1">Pending</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Step Results */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Validation Results</h3>
            {steps.map((step) => {
              const Icon = step.icon
              const status = step.validation.status
              const isExpanded = expandedSteps.has(step.key)
              const hasDetails = step.validation.details && step.validation.details.length > 0

              return (
                <Card
                  key={step.key}
                  className={`transition-all ${getStatusColor(status)}`}
                >
                  <CardContent className="p-4">
                    <div 
                      className={`flex items-start gap-4 ${hasDetails ? 'cursor-pointer' : ''}`}
                      onClick={() => hasDetails && toggleStep(step.key)}
                    >
                      <div className="flex-shrink-0">
                        {getStatusIcon(status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="text-gray-600" />
                            <span className="font-medium text-gray-900">{step.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'warning' ? 'bg-amber-100 text-amber-700' :
                              status === 'fail' ? 'bg-red-100 text-red-700' :
                              status === 'validating' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {getStatusLabel(status)}
                            </span>
                            {hasDetails && (
                              isExpanded 
                                ? <ChevronUp size={16} className="text-gray-500" />
                                : <ChevronDown size={16} className="text-gray-500" />
                            )}
                          </div>
                        </div>
                        {step.validation.message && (
                          <p className="text-sm text-gray-600 mt-1">
                            {step.validation.message}
                          </p>
                        )}
                        {hasDetails && isExpanded && (
                          <ul className="mt-3 space-y-1 border-t border-gray-200/50 pt-3">
                            {step.validation.details!.map((detail, idx) => (
                              <li key={idx} className="text-xs text-gray-600">
                                {detail}
                              </li>
                            ))}
                          </ul>
                        )}
                        {hasDetails && !isExpanded && (
                          <p className="text-xs text-gray-500 mt-1">
                            Click to see {step.validation.details!.length} details
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Strategist Notes */}
          <div className="space-y-2">
            <Label htmlFor="strategist-notes" className="text-sm font-semibold text-gray-700">
              Strategist Notes (Optional)
            </Label>
            <Textarea
              id="strategist-notes"
              placeholder="Add any notes for the reviewer... (e.g., special requests, context, concerns)"
              value={strategistNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              These notes will be visible to the reviewer when approving delivery.
            </p>
          </div>

          {/* Submit Section */}
          {canSubmit ? (
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={24} className="text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Ready for Delivery Approval
                      </h3>
                      <p className="text-sm text-gray-700">
                        All validations passed. Submit to request delivery approval.
                        {warningCount > 0 && (
                          <span className="block text-amber-700 mt-1">
                            ⚠️ {warningCount} warning{warningCount > 1 ? 's' : ''} - please review before submitting.
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={handleSubmitClick}
                      disabled={isSubmitting}
                      size="lg"
                      className="shadow-lg bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          Submit for Delivery Approval
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : failedCount > 0 ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                    <XCircle size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-1">
                      Cannot Submit - Validation Failed
                    </h3>
                    <p className="text-sm text-red-700">
                      {failedCount} validation{failedCount > 1 ? 's' : ''} failed. Fix the issues above before requesting delivery approval.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-amber-900 mb-1">
                      Validations Incomplete
                    </h3>
                    <p className="text-sm text-amber-700">
                      Complete all 3 validation steps before submitting. Use the tabs above to validate each section.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send size={20} className="text-emerald-600" />
              Confirm Delivery Submission
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                <p>You're about to submit the following for delivery approval:</p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client</span>
                    <span className="font-semibold text-gray-900">{clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform</span>
                    <span className="font-semibold text-gray-900">{platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaigns</span>
                    <span className="font-semibold text-gray-900">{campaigns.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Leads</span>
                    <span className="font-semibold text-gray-900">{totalLeads.toLocaleString()}</span>
                  </div>
                </div>

                {warningCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
                    ⚠️ This submission has {warningCount} warning{warningCount > 1 ? 's' : ''}. 
                    The reviewer will see these.
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  This will be sent for review. You'll be notified when it's approved or if changes are needed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send size={16} className="mr-1" />
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
