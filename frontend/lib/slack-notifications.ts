// Slack notification utilities for submission system

import { Submission } from './submissions'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export interface SlackNotificationResult {
  success: boolean
  error?: string
}

function getStatusEmoji(status: Submission['status']): string {
  switch (status) {
    case 'pending': return '⏳'
    case 'approved': return '✅'
    case 'rejected': return '❌'
    case 'launched': return '🚀'
    default: return '📋'
  }
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return '🟢'
  if (score >= 60) return '🟡'
  return '🔴'
}

export async function sendSubmissionNotification(
  submission: Submission,
  baseUrl: string = 'http://localhost:3000'
): Promise<SlackNotificationResult> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('Slack webhook URL not configured, skipping notification')
    return { success: true } // Not an error, just not configured
  }

  const totalLeads = submission.campaigns.reduce((sum, c) => sum + c.leadCount, 0)
  const campaignNames = submission.campaigns.map(c => c.campaignName).join(', ')
  
  const emailScore = submission.validationResults.emailCopy.score
  const leadScore = submission.validationResults.leadList.score
  const mailboxScore = submission.validationResults.mailboxHealth.score

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${getStatusEmoji(submission.status)} New Delivery Submission`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Client:*\n${submission.clientName}`
          },
          {
            type: 'mrkdwn',
            text: `*Platform:*\n${submission.platform.charAt(0).toUpperCase() + submission.platform.slice(1)}`
          },
          {
            type: 'mrkdwn',
            text: `*Campaigns:*\n${submission.campaigns.length}`
          },
          {
            type: 'mrkdwn',
            text: `*Total Leads:*\n${totalLeads.toLocaleString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Campaigns:* ${campaignNames}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Validation Scores:*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `${getScoreEmoji(emailScore)} *Email Copy:* ${emailScore}/100`
          },
          {
            type: 'mrkdwn',
            text: `${getScoreEmoji(leadScore)} *Lead List:* ${leadScore}/100`
          },
          {
            type: 'mrkdwn',
            text: `${getScoreEmoji(mailboxScore)} *Mailbox Health:* ${mailboxScore}/100`
          }
        ]
      },
      ...(submission.strategistNotes ? [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Strategist Notes:*\n${submission.strategistNotes.substring(0, 500)}${submission.strategistNotes.length > 500 ? '...' : ''}`
          }
        }
      ] : []),
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📝 Submitted by *${submission.submittedBy}* | ID: \`${submission.id}\``
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Submission',
              emoji: true
            },
            url: `${baseUrl}/submissions/${submission.id}`,
            style: 'primary'
          }
        ]
      }
    ]
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Slack notification failed:', text)
      return { success: false, error: text }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending Slack notification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function sendStatusUpdateNotification(
  submission: Submission,
  action: 'approved' | 'rejected' | 'launched',
  reviewer: string,
  notes?: string,
  baseUrl: string = 'http://localhost:3000'
): Promise<SlackNotificationResult> {
  if (!SLACK_WEBHOOK_URL) {
    return { success: true }
  }

  const actionEmoji = action === 'approved' ? '✅' : action === 'rejected' ? '❌' : '🚀'
  const actionText = action === 'approved' ? 'Approved' : action === 'rejected' ? 'Rejected' : 'Launched'

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${actionEmoji} Submission ${actionText}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Client:*\n${submission.clientName}`
          },
          {
            type: 'mrkdwn',
            text: `*Submission ID:*\n\`${submission.id}\``
          },
          {
            type: 'mrkdwn',
            text: `*Reviewed by:*\n${reviewer}`
          },
          {
            type: 'mrkdwn',
            text: `*Campaigns:*\n${submission.campaigns.length}`
          }
        ]
      },
      ...(notes ? [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Review Notes:*\n${notes}`
          }
        }
      ] : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
              emoji: true
            },
            url: `${baseUrl}/submissions/${submission.id}`
          }
        ]
      }
    ]
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: text }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
