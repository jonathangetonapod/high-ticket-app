import { NextRequest, NextResponse } from 'next/server'
import { 
  getSubmissionById, 
  updateSubmission, 
  deleteSubmission 
} from '@/lib/submissions'
import { sendStatusUpdateNotification } from '@/lib/slack-notifications'
import { UpdateSubmissionSchema } from '@/lib/validations/submission'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/submissions/[id] - Get a single submission
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const submission = await getSubmissionById(id)

    if (!submission) {
      return errorResponse('Submission not found', 404)
    }

    return successResponse({ submission })
  } catch (error) {
    console.error('Error fetching submission:', error)
    return errorResponse('Failed to fetch submission', 500)
  }
}

// PUT /api/submissions/[id] - Update submission status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate with Zod
    const result = UpdateSubmissionSchema.safeParse(body)
    
    if (!result.success) {
      return validationErrorResponse(result.error)
    }

    const validatedData = result.data

    // Get existing submission first
    const existing = await getSubmissionById(id)
    if (!existing) {
      return errorResponse('Submission not found', 404)
    }

    // Build update object
    const updates: {
      status?: 'pending' | 'approved' | 'rejected' | 'launched'
      reviewedBy?: string
      reviewedAt?: string
      reviewNotes?: string
    } = {}

    if (validatedData.status) {
      updates.status = validatedData.status
      
      // Set review metadata for status changes
      if (['approved', 'rejected', 'launched'].includes(validatedData.status)) {
        updates.reviewedBy = validatedData.reviewedBy || 'Unknown'
        updates.reviewedAt = new Date().toISOString()
        if (validatedData.reviewNotes) {
          updates.reviewNotes = validatedData.reviewNotes
        }
      }
    }

    const submission = await updateSubmission(id, updates)

    if (!submission) {
      return errorResponse('Failed to update submission', 500)
    }

    // Send Slack notification for status changes (non-blocking)
    if (validatedData.status && ['approved', 'rejected', 'launched'].includes(validatedData.status)) {
      const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
      sendStatusUpdateNotification(
        submission,
        validatedData.status as 'approved' | 'rejected' | 'launched',
        validatedData.reviewedBy || 'Unknown',
        validatedData.reviewNotes,
        baseUrl
      ).catch(err => {
        console.error('Failed to send Slack notification:', err)
      })
    }

    return successResponse({
      submission,
      message: `Submission ${id} updated successfully`
    })
  } catch (error) {
    console.error('Error updating submission:', error)
    return errorResponse('Failed to update submission', 500)
  }
}

// DELETE /api/submissions/[id] - Delete a submission
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const deleted = await deleteSubmission(id)

    if (!deleted) {
      return errorResponse('Submission not found', 404)
    }

    return successResponse({
      deleted: true,
      message: `Submission ${id} deleted successfully`
    })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return errorResponse('Failed to delete submission', 500)
  }
}
