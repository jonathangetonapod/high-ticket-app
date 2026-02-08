'use client'

import { useState } from 'react'
import {
  Settings,
  Loader2,
  Info,
  CheckCircle,
  AlertTriangle,
  Mail
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MailboxData, MailboxAccount, ValidationResult } from './types'

interface MailboxHealthCheckProps {
  clientId: string
  clientName: string
  platform: string
  validation: ValidationResult
  onValidate: () => void
  getValidationCard: (validation: ValidationResult) => React.ReactNode
}

export function MailboxHealthCheck({
  clientId,
  clientName,
  platform,
  validation,
  onValidate,
  getValidationCard
}: MailboxHealthCheckProps) {
  const [mailboxData, setMailboxData] = useState<MailboxData | null>(null)
  const [loadingMailboxes, setLoadingMailboxes] = useState(false)

  const loadMailboxes = async () => {
    if (!clientName || platform !== 'bison') {
      console.error('Can only load mailboxes for Bison clients')
      return
    }

    try {
      setLoadingMailboxes(true)
      const response = await fetch(`/api/bison/sender-emails?clientName=${encodeURIComponent(clientName)}`)
      const data = await response.json()

      if (data.success) {
        setMailboxData({
          accounts: data.accounts,
          health_summary: data.health_summary,
        })
      } else {
        console.error('Failed to load mailboxes:', data.error)
      }
    } catch (error) {
      console.error('Error loading mailboxes:', error)
    } finally {
      setLoadingMailboxes(false)
    }
  }

  const getMailboxStatus = (account: MailboxAccount) => {
    const emailsSent = account.warmup_emails_sent || 0
    const bouncesCaused = account.warmup_bounces_caused_count || 0
    const bounceRate = emailsSent > 0 ? (bouncesCaused / emailsSent) * 100 : 0
    const score = account.warmup_score || 0
    const hasMinimumWarmup = emailsSent >= 140
    const isDisabled = (account.warmup_disabled_for_bouncing_count || 0) > 0

    const isCritical = isDisabled || score < 30 || bounceRate > 5
    const isWarning = !isCritical && (!hasMinimumWarmup || score < 50 || bounceRate > 2)
    const isHealthy = !isCritical && !isWarning

    return { isCritical, isWarning, isHealthy, emailsSent, bounceRate, score, hasMinimumWarmup, isDisabled }
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings size={20} className="text-gray-700" />
          </div>
          Mailbox Health Check
        </CardTitle>
        <CardDescription>
          Validate mailbox health, warmup status, and sending readiness
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          {!clientId && (
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900">
                    Please select a client in Step 1 first
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {clientId && platform === 'bison' && (
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Mail size={20} className="text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Mailbox Health Check</p>
                    <p className="text-sm text-gray-700">
                      Check if all sender mailboxes are ready to send campaigns
                    </p>
                  </div>
                </div>

                <Button
                  onClick={loadMailboxes}
                  disabled={loadingMailboxes}
                  className="w-full shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {loadingMailboxes ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Checking Mailboxes...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Check Mailbox Status
                    </>
                  )}
                </Button>

                {/* Mailbox Health Summary */}
                {mailboxData && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="bg-emerald-50 border-2 border-emerald-300">
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl font-bold text-emerald-600">
                            {mailboxData.health_summary.healthy}
                          </div>
                          <div className="text-sm text-gray-900 mt-1 font-semibold">✅ GOOD</div>
                          <div className="text-xs text-gray-600 mt-0.5">Ready to send</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-50 border-2 border-amber-300">
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl font-bold text-amber-600">
                            {mailboxData.health_summary.warning}
                          </div>
                          <div className="text-sm text-gray-900 mt-1 font-semibold">⚠️ WARNING</div>
                          <div className="text-xs text-gray-600 mt-0.5">Needs review</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 border-2 border-red-300">
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl font-bold text-red-600">
                            {mailboxData.health_summary.critical}
                          </div>
                          <div className="text-sm text-gray-900 mt-1 font-semibold">🚫 BAD</div>
                          <div className="text-xs text-gray-600 mt-0.5">Cannot send</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Overall Status Message */}
                    {mailboxData.health_summary.critical === 0 && mailboxData.health_summary.warning === 0 ? (
                      <Card className="bg-emerald-50 border-2 border-emerald-300">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle size={24} className="text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold text-emerald-900">
                                ALL CLEAR - Infrastructure is Ready
                              </p>
                              <p className="text-sm text-emerald-800 mt-1">
                                ✅ All {mailboxData.health_summary.total} mailboxes are enabled and healthy
                              </p>
                              <p className="text-sm text-emerald-700 mt-2">
                                <strong>Next step:</strong> Confirm with client that warmup has been running for at least 2 weeks
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : mailboxData.health_summary.critical > 0 ? (
                      <Card className="bg-red-50 border-2 border-red-300">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle size={24} className="text-red-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold text-red-900">
                                CRITICAL ISSUE - Cannot Launch Campaign
                              </p>
                              <p className="text-sm text-red-800 mt-1">
                                🚫 {mailboxData.health_summary.critical} mailbox{mailboxData.health_summary.critical > 1 ? 'es are' : ' is'} disabled and cannot send emails
                              </p>
                              <p className="text-sm text-red-700 mt-2">
                                <strong>Action required:</strong> Contact client to fix disabled mailboxes before launching
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-amber-50 border-2 border-amber-300">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle size={24} className="text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold text-amber-900">
                                WARNING - Review Required
                              </p>
                              <p className="text-sm text-amber-800 mt-1">
                                ⚠️ {mailboxData.health_summary.warning} mailbox{mailboxData.health_summary.warning > 1 ? 'es need' : ' needs'} attention
                              </p>
                              <p className="text-sm text-amber-700 mt-2">
                                <strong>Action required:</strong> Review mailboxes below for issues
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Detailed Mailbox List */}
                    <Card className="bg-white">
                      <CardContent className="p-4">
                        <div className="mb-4">
                          <p className="text-base font-bold text-gray-900">Individual Mailbox Status</p>
                          <p className="text-xs text-gray-600 mt-1">Showing all {mailboxData.health_summary.total} mailboxes (warmup data from last 90 days)</p>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {mailboxData.accounts.map((account) => {
                            const status = getMailboxStatus(account)

                            return (
                              <Card key={account.id} className={`
                                ${status.isCritical ? 'bg-red-50 border-2 border-red-400' : ''}
                                ${status.isWarning ? 'bg-amber-50 border-2 border-amber-300' : ''}
                                ${status.isHealthy ? 'bg-emerald-50 border-2 border-emerald-300' : ''}
                              `}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`
                                          text-xs font-bold px-2.5 py-1 rounded-md
                                          ${status.isCritical ? 'bg-red-600 text-white' : ''}
                                          ${status.isWarning ? 'bg-amber-600 text-white' : ''}
                                          ${status.isHealthy ? 'bg-emerald-600 text-white' : ''}
                                        `}>
                                          {status.isCritical ? '🚫 DISABLED' : status.isWarning ? '⚠️ WARNING' : '✅ GOOD'}
                                        </span>
                                      </div>
                                      <p className="text-sm font-semibold text-gray-900 mt-2 truncate">
                                        {account.email}
                                      </p>
                                      <p className="text-xs text-gray-600 mt-0.5">
                                        {account.name}
                                      </p>
                                      {account.created_at && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          📅 Added: {new Date(account.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </p>
                                      )}
                                      <div className="mt-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <span className="text-gray-600">Score:</span>
                                            <span className={`ml-1 font-bold ${
                                              status.score >= 50 ? 'text-emerald-600' : status.score >= 30 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                              {status.score}/100
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Emails Sent:</span>
                                            <span className={`ml-1 font-bold ${
                                              status.hasMinimumWarmup ? 'text-emerald-600' : 'text-amber-600'
                                            }`}>
                                              {status.emailsSent}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Replies:</span>
                                            <span className="ml-1 font-semibold text-gray-700">
                                              {account.warmup_replies_received}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Bounce Rate:</span>
                                            <span className={`ml-1 font-bold ${
                                              status.bounceRate <= 2 ? 'text-emerald-600' : status.bounceRate <= 5 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                              {status.bounceRate.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>

                                        {status.emailsSent > 0 && (
                                          <div className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                                            <span className="font-medium">Est. warmup duration:</span>
                                            <span className="ml-1">
                                              ~{Math.round(status.emailsSent / 10)} days
                                              {!status.hasMinimumWarmup && (
                                                <span className="ml-1 text-amber-600 font-semibold">(need 14+ days)</span>
                                              )}
                                            </span>
                                          </div>
                                        )}

                                        {status.isCritical && (
                                          <div className="text-xs bg-red-100 text-red-800 px-2 py-1.5 rounded mt-2 font-semibold">
                                            {status.isDisabled && '🚫 DISABLED: Mailbox disabled for bouncing - cannot send'}
                                            {!status.isDisabled && status.score < 30 && '📊 CRITICAL: Very low warmup score (need 30+)'}
                                            {!status.isDisabled && status.score >= 30 && status.bounceRate > 5 && `⚠️ CRITICAL: High bounce rate ${status.bounceRate.toFixed(1)}% (need < 5%)`}
                                          </div>
                                        )}
                                        {!status.isCritical && status.isWarning && (
                                          <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1.5 rounded mt-2 font-semibold">
                                            {(() => {
                                              const issues = []
                                              if (!status.hasMinimumWarmup) issues.push('⏰ Needs 14+ days warmup')
                                              if (status.score < 50) issues.push('📊 Low score (need 50+)')
                                              if (status.bounceRate > 2) issues.push(`⚠️ Bounce rate ${status.bounceRate.toFixed(1)}% (target < 2%)`)
                                              return issues.join(' • ')
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className={`
                                      w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0
                                      ${status.isCritical ? 'bg-red-100' : ''}
                                      ${status.isWarning ? 'bg-amber-100' : ''}
                                      ${status.isHealthy ? 'bg-emerald-100' : ''}
                                    `}>
                                      <div className="text-center">
                                        <div className={`
                                          text-2xl font-bold
                                          ${status.isCritical ? 'text-red-700' : ''}
                                          ${status.isWarning ? 'text-amber-700' : ''}
                                          ${status.isHealthy ? 'text-emerald-700' : ''}
                                        `}>
                                          {account.warmup_score}
                                        </div>
                                        <div className="text-xs text-gray-600 font-medium">Warmup</div>
                                        <div className="text-xs text-gray-600">Score</div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {clientId && platform !== 'bison' && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Mailbox health check is currently only available for Bison clients. For Instantly clients, check the Instantly dashboard directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Button
          onClick={onValidate}
          disabled={!clientId || validation.status === 'validating'}
          className="w-full shadow-lg"
          size="lg"
        >
          {validation.status === 'validating' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Checking Infrastructure...
            </>
          ) : (
            <>
              <Settings size={20} />
              Validate Infrastructure
            </>
          )}
        </Button>

        {getValidationCard(validation)}
      </CardContent>
    </Card>
  )
}
