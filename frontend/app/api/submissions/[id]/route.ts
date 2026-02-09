import { NextRequest, NextResponse } from 'next/server'
import { 
  getSubmissionById, 
  updateSubmission, 
  deleteSubmission 
} from '@/lib/submissions'
import { sendStatusUpdateNotification } from '@/lib/slack-notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/submissions/[id] - Get a single submission
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const submission = await getSubmissionById(id)

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      submission
    })
  } catch (error) {
    console.error('Error fetching submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission' },
      { status: 500 }
    )
  }
}

// PUT /api/submissions/[id] - Update submission status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get existing submission first
    const existing = await getSubmissionById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Validate status if provided
    if (body.status && !['pending', 'approved', 'rejected', 'launched'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: {
      status?: 'pending' | 'approved' | 'rejected' | 'launched'
      reviewedBy?: string
      reviewedAt?: string
      reviewNotes?: string
    } = {}

    if (body.status) {
      updates.status = body.status
      
      // Set review metadata for status changes
      if (['approved', 'rejected', 'launched'].includes(body.status)) {
        updates.reviewedBy = body.reviewedBy || 'Unknown'
        updates.reviewedAt = new Date().toISOString()
        if (body.reviewNotes) {
          updates.reviewNotes = body.reviewNotes
        }
      }
    }

    const submission = await updateSubmission(id, updates)

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Failed to update submission' },
        { status: 500 }
      )
    }

    // Send Slack notification for status changes (non-blocking)
    if (body.status && ['approved', 'rejected', 'launched'].includes(body.status)) {
      const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
      sendStatusUpdateNotification(
        submission,
        body.status as 'approved' | 'rejected' | 'launched',
        body.reviewedBy || 'Unknown',
        body.reviewNotes,
        baseUrl
      ).catch(err => {
        console.error('Failed to send Slack notification:', err)
      })
    }

    return NextResponse.json({
      success: true,
      submission,
      message: `Submission ${id} updated successfully`
    })
  } catch (error) {
    console.error('Error updating submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update submission' },
      { status: 500 }
    )
  }
}

// DELETE /api/submissions/[id] - Delete a submission
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const deleted = await deleteSubmission(id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Submission ${id} deleted successfully`
    })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete submission' },
      { status: 500 }
    )
  }
}
