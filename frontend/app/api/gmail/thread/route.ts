import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')
    const account = searchParams.get('account') || undefined

    if (!threadId) {
      return NextResponse.json(
        { success: false, error: 'Missing threadId parameter' },
        { status: 400 }
      )
    }

    // TODO: Connect to BridgeKit MCP
    // const result = await mcp__claude_ai_BridgeKit__get_email_thread({
    //   thread_id: threadId,
    //   account
    // })

    // Mock data for now - simulating a complete thread
    const mockThread = {
      success: true,
      thread_id: threadId,
      message_count: 5,
      account_used: 'jay@leadgenjay.com',
      messages: [
        {
          id: '188cba5e9b12a456',
          from: 'John Smith <john@acmecorp.com>',
          to: 'jay@leadgenjay.com',
          subject: 'Lead Gen Campaign Inquiry',
          date: '2026-01-20T10:30:00',
          body: `Hi Jay,

I'm reaching out about a lead generation campaign for our B2B SaaS product. We're looking to target VP and Director level Sales leaders.

Our ideal customer profile:
- Company size: 50-500 employees
- Industry: B2B SaaS
- Job titles: VP Sales, Director of Sales, Head of Sales
- Geography: United States (primarily)

Can we schedule a strategy call to discuss this in detail?

Best regards,
John Smith
CEO, Acme Corp
john@acmecorp.com`,
          snippet: "I'm reaching out about a lead generation campaign for our B2B SaaS product...",
          labels: ['INBOX']
        },
        {
          id: '188cba5e9b12a457',
          from: 'jay@leadgenjay.com',
          to: 'john@acmecorp.com',
          subject: 'RE: Lead Gen Campaign Inquiry',
          date: '2026-01-20T15:45:00',
          body: `Hi John,

Thanks for reaching out! I'd love to help you with this campaign. Let me schedule a strategy call with you.

Before our call, please complete this intake form so I can prepare:
https://docs.google.com/forms/acmecorp-intake

Looking forward to speaking with you!

Best,
Jay`,
          snippet: "Thanks for reaching out! I'd love to help...",
          labels: ['SENT']
        },
        {
          id: '188cba5e9b12a458',
          from: 'John Smith <john@acmecorp.com>',
          to: 'jay@leadgenjay.com',
          subject: 'RE: Lead Gen Campaign Inquiry',
          date: '2026-01-21T09:20:00',
          body: `Hi Jay,

Intake form completed! Here's the link: https://docs.google.com/forms/acmecorp-intake/viewform

Also, here's our value proposition we want to communicate:
"We help sales teams close 30% more deals by automating their pipeline management and providing real-time insights."

Key pain points we solve:
1. Manual data entry wasting time
2. Lack of visibility into pipeline health
3. Missed follow-up opportunities
4. Inaccurate forecasting

Let me know when you're available for the strategy call.

Thanks,
John`,
          snippet: 'Intake form completed! Here\'s the link...',
          labels: ['INBOX']
        },
        {
          id: '188cba5e9b12a459',
          from: 'jay@leadgenjay.com',
          to: 'john@acmecorp.com',
          subject: 'RE: Lead Gen Campaign Inquiry - Strategy Call Scheduled',
          date: '2026-01-22T14:00:00',
          body: `Hi John,

Perfect! I've reviewed your intake form. Great details.

Strategy call scheduled for Thursday, Jan 23 at 2pm EST.
Fathom Meeting Link: https://fathom.video/call/abc-123-xyz

I'll come prepared with some initial campaign ideas based on your ICP and value prop.

See you Thursday!

Best,
Jay`,
          snippet: 'Perfect! I\'ve reviewed your intake form...',
          labels: ['SENT']
        },
        {
          id: '188cba5e9b12a460',
          from: 'John Smith <john@acmecorp.com>',
          to: 'jay@leadgenjay.com',
          subject: 'RE: Lead Gen Campaign Inquiry - Strategy Call Follow-up',
          date: '2026-01-25T14:30:00',
          body: `Hi Jay,

Thanks for the excellent strategy call yesterday! Really appreciated the insights.

Key takeaways from our discussion:
- Target: VP/Director Sales at B2B SaaS companies (50-500 employees)
- Focus on companies using Salesforce or HubSpot
- 3-email sequence (not 5) due to higher intent audience
- Lead with ROI/time savings messaging
- Expected response rate: 5-8%
- Timeline: Launch by February 5th

I'm excited to see the campaign come together. Let me know next steps!

Best,
John Smith
CEO, Acme Corp

P.S. Here's the Fathom recording from our call: https://fathom.video/share/abc-123-xyz`,
          snippet: 'Thanks for the excellent strategy call yesterday!...',
          labels: ['INBOX']
        }
      ]
    }

    return NextResponse.json(mockThread)
  } catch (error) {
    console.error('Error fetching email thread:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email thread' },
      { status: 500 }
    )
  }
}
