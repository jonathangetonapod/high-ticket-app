// Fathom Client - Replicates Python implementation from gmail-reply-tracker-mcp
// API Documentation: https://api.fathom.ai/external/v1

const FATHOM_API_BASE_URL = 'https://api.fathom.ai/external/v1'
const FATHOM_API_KEY = process.env.FATHOM_API_KEY || ''

interface TranscriptEntry {
  speaker_name: string
  speaker_email: string
  text: string
  timestamp: string
}

interface ActionItem {
  description: string
  completed: boolean
  user_generated: boolean
  timestamp: string
  playback_url: string
  assignee_name?: string
  assignee_email?: string
}

interface Meeting {
  recording_id: number
  title: string
  url: string
  share_url: string
  scheduled_start: string
  scheduled_end: string
  recording_start: string
  recording_end: string
  language: string
  attendees: Array<{
    name: string
    email: string
    is_external: boolean
  }>
  action_items?: ActionItem[]
}

/**
 * Make authenticated request to Fathom API
 * Replicates: FathomClient._make_request() from fathom_client.py
 */
async function makeFathomRequest<T>(endpoint: string): Promise<T> {
  if (!FATHOM_API_KEY) {
    throw new Error('FATHOM_API_KEY environment variable is not set')
  }

  const url = `${FATHOM_API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': FATHOM_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Fathom API key')
      } else if (response.status === 404) {
        throw new Error('Recording not found')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      } else {
        throw new Error(`Fathom API error: ${response.statusText}`)
      }
    }

    return await response.json()

  } catch (error) {
    console.error('Error making Fathom API request:', error)
    throw error
  }
}

/**
 * Get full transcript of a Fathom meeting
 * Replicates: FathomClient.get_transcript() from fathom_client.py:238-257
 *
 * API Endpoint: GET /recordings/{recording_id}/transcript
 */
export async function getFathomTranscript(recordingId: number): Promise<{
  success: boolean
  recording_id: number
  entry_count: number
  transcript: TranscriptEntry[]
  error?: string
}> {
  try {
    console.log(`Fetching Fathom transcript for recording ${recordingId}...`)

    const data = await makeFathomRequest<{ transcript: TranscriptEntry[] }>(
      `/recordings/${recordingId}/transcript`
    )

    const transcript = data.transcript || []

    console.log(`✓ Loaded ${transcript.length} transcript entries`)

    return {
      success: true,
      recording_id: recordingId,
      entry_count: transcript.length,
      transcript,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getFathomTranscript:', errorMsg)

    return {
      success: false,
      recording_id: recordingId,
      entry_count: 0,
      transcript: [],
      error: errorMsg,
    }
  }
}

/**
 * Get AI-generated summary of a Fathom meeting
 * Replicates: FathomClient.get_summary() from fathom_client.py:259-278
 *
 * API Endpoint: GET /recordings/{recording_id}/summary
 */
export async function getFathomSummary(recordingId: number): Promise<{
  success: boolean
  recording_id: number
  template: string
  summary: string
  error?: string
}> {
  try {
    console.log(`Fetching Fathom summary for recording ${recordingId}...`)

    const data = await makeFathomRequest<{ template: string; summary: string }>(
      `/recordings/${recordingId}/summary`
    )

    console.log(`✓ Loaded summary (template: ${data.template})`)

    return {
      success: true,
      recording_id: recordingId,
      template: data.template || '',
      summary: data.summary || '',
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getFathomSummary:', errorMsg)

    return {
      success: false,
      recording_id: recordingId,
      template: '',
      summary: '',
      error: errorMsg,
    }
  }
}

/**
 * Get action items extracted from a Fathom meeting
 * Replicates: get_fathom_action_items() from server.py:4788-4849
 *
 * Note: This requires fetching all meetings and finding the matching recording_id
 * API Endpoint: GET /meetings (with limit=100 to search for the recording)
 */
export async function getFathomActionItems(recordingId: number): Promise<{
  success: boolean
  recording_id: number
  count: number
  action_items: ActionItem[]
  error?: string
}> {
  try {
    console.log(`Fetching Fathom action items for recording ${recordingId}...`)

    // Fetch meetings to find the one with matching recording_id
    const data = await makeFathomRequest<{ meetings: Meeting[] }>(
      `/meetings?limit=100`
    )

    const meetings = data.meetings || []

    // Find the meeting with matching recording_id
    const meeting = meetings.find(m => m.recording_id === recordingId)

    if (!meeting) {
      throw new Error(`Meeting with recording_id ${recordingId} not found`)
    }

    const actionItems = meeting.action_items || []

    console.log(`✓ Loaded ${actionItems.length} action items`)

    return {
      success: true,
      recording_id: recordingId,
      count: actionItems.length,
      action_items: actionItems,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getFathomActionItems:', errorMsg)

    return {
      success: false,
      recording_id: recordingId,
      count: 0,
      action_items: [],
      error: errorMsg,
    }
  }
}

/**
 * Get all Fathom data for a meeting (transcript + summary + action items)
 * Convenience function to fetch everything at once
 */
export async function getFathomMeetingData(recordingId: number) {
  try {
    // Fetch all data in parallel
    const [transcriptResult, summaryResult, actionItemsResult] = await Promise.all([
      getFathomTranscript(recordingId),
      getFathomSummary(recordingId),
      getFathomActionItems(recordingId),
    ])

    return {
      success: true,
      recording_id: recordingId,
      transcript: transcriptResult.success ? transcriptResult.transcript : [],
      summary: summaryResult.success ? summaryResult.summary : '',
      action_items: actionItemsResult.success ? actionItemsResult.action_items : [],
      errors: {
        transcript: transcriptResult.error,
        summary: summaryResult.error,
        action_items: actionItemsResult.error,
      },
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in getFathomMeetingData:', errorMsg)

    return {
      success: false,
      recording_id: recordingId,
      error: errorMsg,
    }
  }
}
