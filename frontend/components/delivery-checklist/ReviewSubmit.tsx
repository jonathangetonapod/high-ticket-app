'use client'

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  FileText,
  Settings,
  Mail,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ValidationResult, ValidationStatus } from './types'

interface ReviewSubmitProps {
  clientName: string
  validations: {
    clientCampaign: ValidationResult
    mailboxHealth: ValidationResult
    emailCopyLeads: ValidationResult
  }
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
  validations,
  onSubmit,
  isSubmitting
}: ReviewSubmitProps) {
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
  const canSubmit = failedCount === 0 && completedCount >= 2 // At least 2 passed, no failures

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Sparkles size={20} className="text-gray-700" />
          </div>
          Review & Submit
        </CardTitle>
        <CardDescription>
          Review all validation results before submitting for final review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Summary */}
        {clientName && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-700">
                    {clientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submission for</p>
                  <p className="text-lg font-semibold text-gray-900">{clientName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Summary */}
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
              <div className="text-2xl font-bold text-gray-600">
                {steps.length - completedCount - warningCount - failedCount}
              </div>
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

            return (
              <Card
                key={step.key}
                className={`transition-all ${getStatusColor(status)}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-gray-600" />
                          <span className="font-medium text-gray-900">{step.label}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'warning' ? 'bg-amber-100 text-amber-700' :
                          status === 'fail' ? 'bg-red-100 text-red-700' :
                          status === 'validating' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      {step.validation.message && (
                        <p className="text-sm text-gray-600 mt-1">
                          {step.validation.message}
                        </p>
                      )}
                      {step.validation.details && step.validation.details.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {step.validation.details.slice(0, 4).map((detail, idx) => (
                            <li key={idx} className="text-xs text-gray-600">
                              {detail}
                            </li>
                          ))}
                          {step.validation.details.length > 4 && (
                            <li className="text-xs text-gray-500 italic">
                              +{step.validation.details.length - 4} more items...
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
                      Ready to Submit!
                    </h3>
                    <p className="text-sm text-gray-700">
                      All critical validations passed. Your submission will be reviewed by Jay.
                      {warningCount > 0 && (
                        <span className="block text-amber-700 mt-1">
                          Note: {warningCount} warning{warningCount > 1 ? 's' : ''} detected - review before submitting.
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={onSubmit}
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
                        <Sparkles size={20} />
                        Submit for Review
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
                    Cannot Submit Yet
                  </h3>
                  <p className="text-sm text-red-700">
                    {failedCount} validation{failedCount > 1 ? 's' : ''} failed. Please fix the issues above before submitting.
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
                    Please complete at least 3 validation steps before submitting. Navigate through the tabs above to validate each section.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
