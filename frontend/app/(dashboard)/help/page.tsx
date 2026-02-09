'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  BookOpen,
  Users,
  CheckSquare,
  Mail,
  Target,
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  Shield,
  MessageSquare,
  Zap,
  HelpCircle,
  Workflow
} from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Help & FAQ" 
        description="Learn how the Delivery Checklist system works"
      />

      <div className="p-8 max-w-5xl mx-auto space-y-8">
        
        {/* How It All Connects */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Workflow className="text-blue-600" />
              How Everything Connects
            </CardTitle>
            <CardDescription>
              The delivery checklist uses Best Practices + Client Context to validate your campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              {/* Best Practices */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                  <BookOpen className="text-purple-600" size={24} />
                </div>
                <h3 className="font-bold text-purple-900">Best Practices</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Team-wide guidelines for email copy, lead lists, warmup, etc.
                </p>
                <p className="text-xs text-purple-500 mt-2">
                  Applies to ALL clients
                </p>
              </div>

              {/* Plus Sign */}
              <div className="flex items-center justify-center">
                <div className="text-3xl text-gray-400 font-bold">+</div>
              </div>

              {/* Client Context */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="w-12 h-12 mx-auto mb-3 bg-amber-100 rounded-full flex items-center justify-center">
                  <Target className="text-amber-600" size={24} />
                </div>
                <h3 className="font-bold text-amber-900">Client Context</h3>
                <p className="text-sm text-amber-700 mt-1">
                  ICP, special requirements, and notes from client calls
                </p>
                <p className="text-xs text-amber-500 mt-2">
                  Specific to EACH client
                </p>
              </div>
            </div>

            {/* Arrow Down */}
            <div className="flex justify-center my-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <ArrowRight className="text-gray-500 rotate-90" size={20} />
              </div>
            </div>

            {/* AI Validation */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
                <Sparkles className="text-emerald-600" size={24} />
              </div>
              <h3 className="font-bold text-emerald-900">AI Validation</h3>
              <p className="text-sm text-emerald-700 mt-1">
                When you validate a campaign, AI checks your work against both Best Practices AND the Client's specific requirements
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Best Practices FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="text-purple-600" size={20} />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="bp-1">
                  <AccordionTrigger className="text-sm">What are Best Practices?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Best Practices are your team's guidelines for creating high-quality campaigns. They include rules for:
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>Email copy (subject lines, body structure, spam words to avoid)</li>
                      <li>Lead lists (required fields, validation rules)</li>
                      <li>ICP matching (how to verify leads match the target)</li>
                      <li>Mailbox warmup (minimum days, score requirements)</li>
                      <li>Campaign strategy (naming, tracking, timing)</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-2">
                  <AccordionTrigger className="text-sm">Who can edit Best Practices?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Only admins can create, edit, or delete Best Practice guides. All team members can view them. Go to <Link href="/admin/best-practices" className="text-blue-600 underline">Admin → Best Practices</Link> to manage them.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-3">
                  <AccordionTrigger className="text-sm">How are they used in validation?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    When you click "Validate" in the Delivery Checklist, the AI reads all your Best Practice guides and checks if the campaign follows them. For example, if your guide says "subject lines should be 30-50 characters", the AI will flag any subject that's too long or too short.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bp-4">
                  <AccordionTrigger className="text-sm">What categories exist?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    <ul className="space-y-2">
                      <li><span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">copy</span> — Email copy, subject lines, sequences</li>
                      <li><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">leads</span> — Lead list quality, ICP matching</li>
                      <li><span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">warmup</span> — Mailbox warmup, deliverability</li>
                      <li><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">strategy</span> — Campaign strategy, client comms</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Client Context FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="text-amber-600" size={20} />
                Client Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="cc-1">
                  <AccordionTrigger className="text-sm">What is Client Context?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Client Context stores everything specific to a client:
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li><strong>ICP Summary</strong> — Target titles, company sizes, industries, geography</li>
                      <li><strong>Special Requirements</strong> — Exclusions, brand voice, compliance needs</li>
                      <li><strong>Transcript Notes</strong> — Notes from onboarding calls</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cc-2">
                  <AccordionTrigger className="text-sm">How do I add Client Context?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Go to <Link href="/clients" className="text-blue-600 underline">Clients</Link>, click the "Context" button on any client, and fill in the fields. You can also paste a call transcript and click "Extract ICP" to auto-populate using AI.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cc-3">
                  <AccordionTrigger className="text-sm">What's the ICP Extraction feature?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    If you paste a Fathom/Fireflies transcript into the "Transcript Notes" field, click the ✨ "Extract ICP" button. AI will automatically pull out:
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>Target titles and roles</li>
                      <li>Company sizes and industries</li>
                      <li>Geographic targets</li>
                      <li>Exclusions and requirements</li>
                      <li>Key quotes from the client</li>
                    </ul>
                    You can review and edit before applying.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cc-4">
                  <AccordionTrigger className="text-sm">Why does the checklist show "No client context"?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    This means nobody has added ICP/requirements for that client yet. The AI validation will still work, but it won't be able to check if the campaign matches the client's specific needs. Click "Add Context" to fix it.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Delivery Checklist FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="text-emerald-600" size={20} />
                Delivery Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="dc-1">
                  <AccordionTrigger className="text-sm">What does the Delivery Checklist do?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    It's a 4-step validation wizard that checks everything before a campaign launches:
                    <ol className="list-decimal ml-4 mt-2 space-y-1">
                      <li><strong>Client & Campaigns</strong> — Select what you're validating</li>
                      <li><strong>Mailbox Health</strong> — Check warmup scores, banned accounts</li>
                      <li><strong>Email & Leads</strong> — Validate copy quality, lead list health</li>
                      <li><strong>Review & Submit</strong> — Final review and submit for approval</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dc-2">
                  <AccordionTrigger className="text-sm">What does "Validate" actually check?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    <strong>Tab 1:</strong> Checks if campaigns exist, have sequences, and aren't paused.<br/>
                    <strong>Tab 2:</strong> Calls the mailbox health API, checks warmup scores, finds banned/paused accounts.<br/>
                    <strong>Tab 3:</strong> AI analyzes email copy against Best Practices + Client Context. Also checks lead list for invalid emails, duplicates, ICP match.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dc-3">
                  <AccordionTrigger className="text-sm">What happens when I submit?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Your submission is saved to the database and appears on the <Link href="/submissions" className="text-blue-600 underline">Submissions</Link> page. If Slack is configured, a notification is sent. A reviewer can then approve, reject, or mark it as launched.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dc-4">
                  <AccordionTrigger className="text-sm">What's the "Validate All" button?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Instead of validating each tab separately, "Validate All" runs all 3 validations in sequence and shows you aggregate results. Faster workflow.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Submissions FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sub-1">
                  <AccordionTrigger className="text-sm">What are submission statuses?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    <ul className="space-y-2">
                      <li><span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Pending</span> — Waiting for review</li>
                      <li><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Approved</span> — Ready to launch</li>
                      <li><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Rejected</span> — Needs fixes</li>
                      <li><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Launched</span> — Campaign is live</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sub-2">
                  <AccordionTrigger className="text-sm">Who can approve submissions?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    Currently anyone with access can approve/reject. In the future, this will be role-based (only reviewers/admins).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sub-3">
                  <AccordionTrigger className="text-sm">Do I get notified?</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600">
                    If a Slack webhook is configured, notifications are sent when submissions are created, approved, rejected, or launched. Ask your admin to set up <code className="bg-gray-100 px-1 rounded">SLACK_WEBHOOK_URL</code>.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-yellow-500" size={20} />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link 
                href="/delivery-checklist" 
                className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-center transition-colors"
              >
                <CheckSquare className="mx-auto text-emerald-600 mb-2" size={24} />
                <span className="text-sm font-medium text-emerald-900">Delivery Checklist</span>
              </Link>
              <Link 
                href="/admin/best-practices" 
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 text-center transition-colors"
              >
                <BookOpen className="mx-auto text-purple-600 mb-2" size={24} />
                <span className="text-sm font-medium text-purple-900">Best Practices</span>
              </Link>
              <Link 
                href="/clients" 
                className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 text-center transition-colors"
              >
                <Users className="mx-auto text-amber-600 mb-2" size={24} />
                <span className="text-sm font-medium text-amber-900">Clients</span>
              </Link>
              <Link 
                href="/submissions" 
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-center transition-colors"
              >
                <FileText className="mx-auto text-blue-600 mb-2" size={24} />
                <span className="text-sm font-medium text-blue-900">Submissions</span>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
