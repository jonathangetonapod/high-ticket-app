import { NextRequest, NextResponse } from 'next/server'
import { 
  createSubmission, 
  getSubmissions,
  Submission 
} from '@/lib/submissions'
import { sendSubmissionNotification } from '@/lib/slack-notifications'

// GET /api/submissions - List all submissions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') as Submission['status'] | null
    const clientId = searchParams.get('clientId')
    const platform = searchParams.get('platform') as 'bison' | 'instantly' | null

    const filters: {
      status?: Submission['status']
      clientId?: string
      platform?: 'bison' | 'instantly'
    } = {}

    if (status) filters.status = status
    if (clientId) filters.clientId = clientId
    if (platform) filters.platform = platform

    const submissions = await getSubmissions(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json({
      success: true,
      submissions,
      count: submissions.length
    })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}

// POST /api/submissions - Create a new submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['clientId', 'clientName', 'platform', 'campaigns', 'validationResults', 'submittedBy']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate platform
    if (!['bison', 'instantly'].includes(body.platform)) {
      return NextResponse.json(
        { success: false, error: 'Platform must be "bison" or "instantly"' },
        { status: 400 }
      )
    }

    // Validate campaigns array
    if (!Array.isArray(body.campaigns) || body.campaigns.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one campaign is required' },
        { status: 400 }
      )
    }

    // Create the submission
    const submission = await createSubmission({
      clientId: body.clientId,
      clientName: body.clientName,
      platform: body.platform,
      campaigns: body.campaigns.map((c: any) => ({
        campaignId: c.campaignId || c.campaign_id,
        campaignName: c.campaignName || c.campaign_name,
        leadCount: c.leadCount || c.lead_count || 0
      })),
      validationResults: {
        emailCopy: {
          score: body.validationResults.emailCopy?.score || 0,
          issues: body.validationResults.emailCopy?.issues || []
        },
        leadList: {
          score: body.validationResults.leadList?.score || 0,
          issues: body.validationResults.leadList?.issues || []
        },
        mailboxHealth: {
          score: body.validationResults.mailboxHealth?.score || 0,
          issues: body.validationResults.mailboxHealth?.issues || []
        }
      },
      strategistNotes: body.strategistNotes || '',
      submittedBy: body.submittedBy
    })

    // Send Slack notification (non-blocking)
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    sendSubmissionNotification(submission, baseUrl).catch(err => {
      console.error('Failed to send Slack notification:', err)
    })

    return NextResponse.json({
      success: true,
      submission,
      message: `Submission ${submission.id} created successfully`
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create submission' },
      { status: 500 }
    )
  }
}
