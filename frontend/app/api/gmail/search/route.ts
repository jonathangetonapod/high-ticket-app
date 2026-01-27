import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const maxResults = searchParams.get('maxResults') || '20'
    const account = searchParams.get('account') || undefined

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing query parameter' },
        { status: 400 }
      )
    }

    // TODO: Connect to BridgeKit MCP
    // const result = await mcp__claude_ai_BridgeKit__search_emails({
    //   query,
    //   max_results: parseInt(maxResults),
    //   account
    // })

    // Mock data for now
    const mockResults = {
      success: true,
      query,
      count: 3,
      results: [
        {
          id: '188cba5e9b12a456',
          thread_id: '188cba5e9b12a456',
          from: 'John Smith <john@acmecorp.com>',
          subject: 'Strategy Call Follow-up - Lead Gen Campaign',
          date: '2026-01-25T14:30:00',
          snippet: 'Thanks for the great strategy call yesterday. As discussed, our target is VP+ Sales leaders in B2B SaaS companies with 50-500 employees...',
          labels: ['INBOX', 'IMPORTANT']
        },
        {
          id: '188cba5e9b12a457',
          thread_id: '188cba5e9b12a456',
          from: 'jay@leadgenjay.com',
          subject: 'RE: Strategy Call Follow-up - Lead Gen Campaign',
          date: '2026-01-25T16:45:00',
          snippet: 'Perfect! I captured all the details. We will focus on VP/Director Sales, B2B SaaS, 50-500 employees. Value prop centers around increasing pipeline...',
          labels: ['SENT']
        },
        {
          id: '188cba5e9b12a458',
          thread_id: '188cba5e9b12a457',
          from: 'Sarah Johnson <sarah@techstartup.io>',
          subject: 'Intake Form Completed - Tech Startup Campaign',
          date: '2026-01-24T09:15:00',
          snippet: 'Completed the intake form as requested. Our ideal customer profile: CTO/VP Engineering at Series A-B startups, tech stack includes React...',
          labels: ['INBOX']
        },
        {
          id: '188cba5e9b12a459',
          thread_id: '188cba5e9b12a458',
          from: 'Mike Chen <mike@enterprisesaas.com>',
          subject: 'Campaign Strategy Discussion',
          date: '2026-01-23T11:20:00',
          snippet: 'Following up on our call. Key points: targeting enterprise decision makers, focus on ROI messaging, 3-email sequence preferred...',
          labels: ['INBOX']
        }
      ]
    }

    return NextResponse.json(mockResults)
  } catch (error) {
    console.error('Error searching emails:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search emails' },
      { status: 500 }
    )
  }
}
