import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, handleAuthError } from '@/lib/session'
import { extractICPRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export interface ExtractedICP {
  targetTitles: string[]
  companySizes: string[]
  industries: string[]
  geography: string[]
  exclusions: string[]
  painPoints: string[]
  budget: string
  timeline: string
  keyQuotes: string[]
}

export interface ICPExtractionResponse {
  success: boolean
  data?: ExtractedICP
  markdown?: string
  error?: string
}

const EXTRACTION_PROMPT = `You are an expert at analyzing sales call transcripts and extracting Ideal Customer Profile (ICP) data.

Analyze the following transcript and extract structured ICP information. Be specific and actionable.

IMPORTANT RULES:
- Only extract information that is EXPLICITLY mentioned or strongly implied in the transcript
- If something isn't mentioned, leave the array empty or string blank
- For company sizes, use standard ranges like "1-50", "50-200", "200-500", "500-1000", "1000+"
- For geography, use country names or regions (US, Canada, EMEA, etc.)
- Key quotes should be direct quotes that reveal pain points, urgency, or decision criteria
- Pain points should be specific problems, not generic statements

Return a JSON object with this EXACT structure (no markdown, just raw JSON):
{
  "targetTitles": ["Job Title 1", "Job Title 2"],
  "companySizes": ["50-200", "200-500"],
  "industries": ["Industry 1", "Industry 2"],
  "geography": ["Country/Region 1", "Country/Region 2"],
  "exclusions": ["Type to exclude 1", "Type to exclude 2"],
  "painPoints": ["Specific pain point 1", "Specific pain point 2"],
  "budget": "$X-$Y/month or range mentioned",
  "timeline": "When they want to start/see results",
  "keyQuotes": ["Important quote 1", "Important quote 2"]
}

TRANSCRIPT:
`

export async function POST(request: NextRequest): Promise<NextResponse<ICPExtractionResponse>> {
  try {
    // Check rate limit
    const rateLimitResult = await extractICPRateLimiter.check(request)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult) as NextResponse<ICPExtractionResponse>
    }

    // Require authentication
    // await requireAuth() // TODO: re-enable

    const { transcript, clientName } = await request.json()

    if (!transcript || transcript.trim().length < 50) {
      return NextResponse.json({
        success: false,
        error: 'Transcript must be at least 50 characters long'
      }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured'
      }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: EXTRACTION_PROMPT + transcript
        }
      ]
    })

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse the JSON response
    let extractedData: ExtractedICP
    try {
      // Clean the response - sometimes Claude wraps in markdown code blocks
      let jsonStr = textContent.text.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      jsonStr = jsonStr.trim()
      
      extractedData = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response. Please try again.'
      }, { status: 500 })
    }

    // Validate structure
    const validatedData: ExtractedICP = {
      targetTitles: Array.isArray(extractedData.targetTitles) ? extractedData.targetTitles : [],
      companySizes: Array.isArray(extractedData.companySizes) ? extractedData.companySizes : [],
      industries: Array.isArray(extractedData.industries) ? extractedData.industries : [],
      geography: Array.isArray(extractedData.geography) ? extractedData.geography : [],
      exclusions: Array.isArray(extractedData.exclusions) ? extractedData.exclusions : [],
      painPoints: Array.isArray(extractedData.painPoints) ? extractedData.painPoints : [],
      budget: typeof extractedData.budget === 'string' ? extractedData.budget : '',
      timeline: typeof extractedData.timeline === 'string' ? extractedData.timeline : '',
      keyQuotes: Array.isArray(extractedData.keyQuotes) ? extractedData.keyQuotes : []
    }

    // Generate markdown summary
    const markdown = generateMarkdownSummary(validatedData, clientName)

    return NextResponse.json({
      success: true,
      data: validatedData,
      markdown
    })

  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse as NextResponse<ICPExtractionResponse>

    console.error('ICP extraction error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract ICP'
    }, { status: 500 })
  }
}

function generateMarkdownSummary(data: ExtractedICP, clientName?: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
  
  const lines: string[] = []
  
  lines.push(`# ICP Summary${clientName ? ` - ${clientName}` : ''}`)
  lines.push(`*Extracted from transcript on ${dateStr}*`)
  lines.push('')
  
  if (data.targetTitles.length > 0) {
    lines.push('## Target Titles')
    data.targetTitles.forEach(title => lines.push(`- ${title}`))
    lines.push('')
  }
  
  if (data.companySizes.length > 0) {
    lines.push('## Company Size')
    lines.push(data.companySizes.join(', ') + ' employees')
    lines.push('')
  }
  
  if (data.industries.length > 0) {
    lines.push('## Industries')
    data.industries.forEach(industry => lines.push(`- ${industry}`))
    lines.push('')
  }
  
  if (data.geography.length > 0) {
    lines.push('## Geography')
    lines.push(data.geography.join(', '))
    lines.push('')
  }
  
  if (data.exclusions.length > 0) {
    lines.push('## Exclusions')
    data.exclusions.forEach(exc => lines.push(`- ${exc}`))
    lines.push('')
  }
  
  if (data.painPoints.length > 0) {
    lines.push('## Pain Points')
    data.painPoints.forEach(pain => lines.push(`- ${pain}`))
    lines.push('')
  }
  
  if (data.budget) {
    lines.push('## Budget')
    lines.push(data.budget)
    lines.push('')
  }
  
  if (data.timeline) {
    lines.push('## Timeline')
    lines.push(data.timeline)
    lines.push('')
  }
  
  if (data.keyQuotes.length > 0) {
    lines.push('## Key Quotes')
    data.keyQuotes.forEach(quote => lines.push(`> "${quote}"`))
    lines.push('')
  }
  
  return lines.join('\n')
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
