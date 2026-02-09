import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, handleAuthError } from "@/lib/session";
import { validateCampaignRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

// Types
interface EmailSequence {
  subject: string;
  body: string;
  step: number;
}

interface Lead {
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  industry?: string;
  companySize?: string;
  [key: string]: string | undefined;
}

interface BestPracticeGuide {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
}

interface BestPractices {
  guides: BestPracticeGuide[];
}

interface ClientContext {
  clientId: string;
  clientName: string;
  icpSummary: string;
  specialRequirements: string;
  transcriptNotes?: string;
  updatedAt: string;
}

interface ValidationIssue {
  type: "copy" | "leads" | "icp" | "strategy";
  severity: "error" | "warning" | "suggestion";
  message: string;
  details?: string;
}

// New: Actionable inline suggestion
interface ActionableFix {
  type: "subject" | "body" | "personalization" | "tone" | "length" | "spam";
  severity: "error" | "warning" | "suggestion";
  message: string;
  original: string;
  suggested: string;
  location: {
    emailIndex: number;
    field: "subject" | "body";
  };
}

// ICP Match Analysis types
interface ICPMatchReason {
  factor: string;
  positive: boolean;
}

interface LeadAnalysis {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  industry?: string;
  matchScore: number;
  matchLevel: "strong" | "partial" | "weak" | "mismatch";
  reasons: ICPMatchReason[];
}

interface ICPMatchSummary {
  strong: number;
  partial: number;
  weak: number;
  mismatch: number;
  total: number;
  averageScore: number;
}

interface ValidationResponse {
  score: number;
  status: "pass" | "needs_review" | "fail";
  summary: string;
  issues: ValidationIssue[];
  suggestions: string[];
  actionableFixes: ActionableFix[];
  bestPracticesChecked: string[];
  clientContextUsed: boolean;
  // Per-lead ICP analysis
  leadAnalysis?: LeadAnalysis[];
  icpMatchSummary?: ICPMatchSummary;
}

interface ValidateCampaignRequest {
  campaignId: string;
  clientId?: string;
  platform: "bison" | "instantly" | string;
  emailSequence: EmailSequence[];
  leadList: Lead[];
  icpDescription: string;
  strategistNotes?: string;
}

// Default best practices when file is missing
const DEFAULT_BEST_PRACTICES: BestPractices = {
  guides: [
    {
      id: "email-copy-default",
      title: "Email Copy Basics",
      category: "copy",
      content: `# Email Copy Basics
- Keep subject lines under 60 characters
- Lead with value, not a pitch
- Use personalization tokens
- Clear call-to-action
- Avoid spam trigger words (FREE, URGENT, etc.)
- Keep paragraphs short (2-3 sentences)`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "lead-list-default",
      title: "Lead List Basics",
      category: "leads",
      content: `# Lead List Basics
- Verify email format validity
- Required: email, first_name, company
- Check for duplicates
- Ensure title matches ICP decision-maker level`,
      updatedAt: new Date().toISOString(),
    },
  ],
};

// Helper: Load best practices
async function loadBestPractices(): Promise<{
  practices: BestPractices;
  fromFile: boolean;
}> {
  try {
    const filePath = path.join(process.cwd(), "data", "best-practices.json");
    const content = await fs.readFile(filePath, "utf-8");
    return { practices: JSON.parse(content), fromFile: true };
  } catch {
    console.warn("Best practices file not found, using defaults");
    return { practices: DEFAULT_BEST_PRACTICES, fromFile: false };
  }
}

// Helper: Load client context
async function loadClientContext(
  clientId: string
): Promise<ClientContext | null> {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "client-context",
      `${clientId}.json`
    );
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    console.warn(`Client context not found for: ${clientId}`);
    return null;
  }
}

// Helper: Format email sequence for prompt
function formatEmailSequence(emails: EmailSequence[]): string {
  return emails
    .map(
      (e) => `
### Step ${e.step}
**Subject:** ${e.subject}

**Body:**
${e.body}
---`
    )
    .join("\n");
}

// Helper: Format leads sample for prompt
function formatLeadsSample(leads: Lead[], sampleSize: number = 20): string {
  const sample = leads.slice(0, sampleSize);
  return sample
    .map(
      (l) =>
        `- ${l.email} | ${l.firstName || ""} ${l.lastName || ""} | ${l.title || "N/A"} @ ${l.company || "N/A"} (${l.industry || "N/A"})`
    )
    .join("\n");
}

// Helper: Determine status from score
function getStatusFromScore(score: number): "pass" | "needs_review" | "fail" {
  if (score >= 80) return "pass";
  if (score >= 50) return "needs_review";
  return "fail";
}

// Helper: Determine match level from score
function getMatchLevel(
  score: number
): "strong" | "partial" | "weak" | "mismatch" {
  if (score >= 80) return "strong";
  if (score >= 60) return "partial";
  if (score >= 40) return "weak";
  return "mismatch";
}

// Build comprehensive validation prompt
function buildValidationPrompt(
  emailSequence: EmailSequence[],
  leadList: Lead[],
  icpDescription: string,
  strategistNotes: string,
  bestPractices: BestPractices,
  clientContext: ClientContext | null
): string {
  const bestPracticesContent = bestPractices.guides
    .map((g) => `## ${g.title}\n${g.content}`)
    .join("\n\n");

  const clientContextSection = clientContext
    ? `
## Client-Specific Context

### Client: ${clientContext.clientName}

### ICP Summary:
${clientContext.icpSummary}

### Special Requirements:
${clientContext.specialRequirements}

${clientContext.transcriptNotes ? `### Notes from Calls:\n${clientContext.transcriptNotes}` : ""}
`
    : `
## Client Context
*No client-specific context file found. Base evaluation on the provided ICP description only.*
`;

  return `You are an expert B2B outbound email campaign strategist and quality assurance specialist.

Your job is to comprehensively validate a campaign before launch, checking the email copy and lead list against our best practices and the client's specific requirements.

---

# BEST PRACTICES GUIDE

${bestPracticesContent}

---

# CAMPAIGN TO VALIDATE

## ICP Description (provided by strategist):
${icpDescription}

## Strategist Notes:
${strategistNotes || "None provided"}

${clientContextSection}

## Email Sequence:
${formatEmailSequence(emailSequence)}

## Lead List (sample of ${Math.min(20, leadList.length)} from ${leadList.length} total):
${formatLeadsSample(leadList)}

---

# YOUR TASK

Evaluate this campaign comprehensively:

1. **Copy Quality**: Does the email copy follow our best practices?
   - Subject line length and effectiveness
   - Body copy structure and tone
   - Personalization usage
   - CTA clarity
   - Spam risk factors

2. **ICP Alignment**: Does the copy match the target ICP?
   - Is the tone appropriate for this audience?
   - Are the pain points relevant?
   - Is the value proposition clear for this persona?

3. **Lead List Quality**: Does the lead list match the ICP?
   - Title/role alignment
   - Company/industry fit
   - Data completeness
   - Any obvious mismatches or red flags

4. **Strategy Coherence**: Overall campaign coherence
   - Copy-to-list alignment
   - Any contradictions with client requirements
   - Missing elements

---

# RESPONSE FORMAT

Return ONLY valid JSON with this exact structure:

{
  "score": <0-100 overall quality score>,
  "summary": "<2-3 sentence executive summary of the validation results>",
  "issues": [
    {
      "type": "<copy|leads|icp|strategy>",
      "severity": "<error|warning|suggestion>",
      "message": "<brief description of the issue>",
      "details": "<optional: more context or examples>"
    }
  ],
  "suggestions": [
    "<actionable improvement suggestion 1>",
    "<actionable improvement suggestion 2>"
  ],
  "actionableFixes": [
    {
      "type": "<subject|body|personalization|tone|length|spam>",
      "severity": "<error|warning|suggestion>",
      "message": "<brief explanation of what's wrong and why this fix helps>",
      "original": "<exact text that should be replaced - copy EXACTLY from the email>",
      "suggested": "<improved replacement text>",
      "location": {
        "emailIndex": <0-based index of the email in the sequence>,
        "field": "<subject|body>"
      }
    }
  ],
  "leadAnalysis": [
    {
      "email": "<lead's email address>",
      "firstName": "<if available>",
      "lastName": "<if available>",
      "company": "<if available>",
      "title": "<if available>",
      "industry": "<if available>",
      "matchScore": <0-100 how well this lead matches the ICP>,
      "matchLevel": "<strong|partial|weak|mismatch>",
      "reasons": [
        { "factor": "<why this matches or doesn't match ICP>", "positive": <true|false> }
      ]
    }
  ]
}

IMPORTANT for leadAnalysis:
- Analyze EACH lead in the sample against the ICP
- matchScore: 80-100 = strong, 60-79 = partial, 40-59 = weak, 0-39 = mismatch
- Include 2-5 reasons per lead explaining match factors
- Positive factors: title matches, industry fits, company size right, etc.
- Negative factors: missing data, wrong industry, too junior, company too small, etc.

IMPORTANT for actionableFixes:
- Focus on subject lines and key body copy improvements
- The "original" field MUST be an EXACT substring from the email (we use it for find/replace)
- Keep suggested text similar in length to original when possible
- Include 2-5 actionable fixes per validation (prioritize highest impact)
- Common fixes: subject line too long, missing personalization, spam trigger words, weak CTAs

Severity guidelines:
- "error": Must fix before launch (spam risk, major ICP mismatch, missing critical elements)
- "warning": Should review (minor issues, opportunities for improvement)
- "suggestion": Nice to have (optimizations, A/B test ideas)

Be specific and actionable. Reference the best practices by name when applicable.`;
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await validateCampaignRateLimiter.check(request)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // Require authentication
    // await requireAuth() // TODO: re-enable

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          message: "ANTHROPIC_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: ValidateCampaignRequest = await request.json();

    // Validate required fields
    const requiredFields = [
      "campaignId",
      "platform",
      "emailSequence",
      "leadList",
      "icpDescription",
    ];
    const missingFields = requiredFields.filter(
      (field) =>
        !(field in body) ||
        body[field as keyof ValidateCampaignRequest] === undefined
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate email sequence
    if (!Array.isArray(body.emailSequence) || body.emailSequence.length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "emailSequence must be a non-empty array",
        },
        { status: 400 }
      );
    }

    // Validate lead list
    if (!Array.isArray(body.leadList) || body.leadList.length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "leadList must be a non-empty array",
        },
        { status: 400 }
      );
    }

    // Load best practices and client context
    const { practices: bestPractices, fromFile: bestPracticesFromFile } =
      await loadBestPractices();

    const clientContext = body.clientId
      ? await loadClientContext(body.clientId)
      : null;

    // Build the comprehensive prompt
    const prompt = buildValidationPrompt(
      body.emailSequence,
      body.leadList,
      body.icpDescription,
      body.strategistNotes || "",
      bestPractices,
      clientContext
    );

    // Call Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096, // Increased for per-lead ICP analysis
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse AI response
    let aiResult: {
      score: number;
      summary: string;
      issues: ValidationIssue[];
      suggestions: string[];
      actionableFixes?: ActionableFix[];
      leadAnalysis?: LeadAnalysis[];
    };

    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json(
        {
          error: "AI response parsing error",
          message: "Failed to parse validation results from AI",
          rawResponse: responseText.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // Process lead analysis and calculate summary
    const leadAnalysis: LeadAnalysis[] = (aiResult.leadAnalysis || []).map(
      (lead) => ({
        ...lead,
        matchLevel: getMatchLevel(lead.matchScore),
      })
    );

    // Calculate ICP match summary
    const icpMatchSummary: ICPMatchSummary = {
      strong: leadAnalysis.filter((l) => l.matchLevel === "strong").length,
      partial: leadAnalysis.filter((l) => l.matchLevel === "partial").length,
      weak: leadAnalysis.filter((l) => l.matchLevel === "weak").length,
      mismatch: leadAnalysis.filter((l) => l.matchLevel === "mismatch").length,
      total: leadAnalysis.length,
      averageScore:
        leadAnalysis.length > 0
          ? leadAnalysis.reduce((sum, l) => sum + l.matchScore, 0) /
            leadAnalysis.length
          : 0,
    };

    // Build final response
    const result: ValidationResponse = {
      score: aiResult.score,
      status: getStatusFromScore(aiResult.score),
      summary: aiResult.summary,
      issues: aiResult.issues || [],
      suggestions: aiResult.suggestions || [],
      actionableFixes: (aiResult.actionableFixes || []).map((fix, idx) => ({
        ...fix,
        id: `fix-${Date.now()}-${idx}`,
      })),
      bestPracticesChecked: bestPractices.guides.map((g) => g.id),
      clientContextUsed: clientContext !== null,
      leadAnalysis,
      icpMatchSummary,
    };

    // Return results with campaign metadata
    return NextResponse.json({
      success: true,
      campaignId: body.campaignId,
      clientId: body.clientId || null,
      platform: body.platform,
      timestamp: new Date().toISOString(),
      validation: result,
      meta: {
        bestPracticesSource: bestPracticesFromFile ? "file" : "defaults",
        clientContextSource: clientContext ? "file" : "none",
        leadsAnalyzed: Math.min(20, body.leadList.length),
        totalLeads: body.leadList.length,
        emailsAnalyzed: body.emailSequence.length,
      },
    });
  } catch (error) {
    // Handle auth errors
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error("Campaign validation error:", error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  // Check what data files are available
  const { fromFile: hasBestPractices } = await loadBestPractices();

  let clientContextFiles: string[] = [];
  try {
    const contextDir = path.join(process.cwd(), "data", "client-context");
    const files = await fs.readdir(contextDir);
    clientContextFiles = files.filter(
      (f) => f.endsWith(".json") && !f.startsWith("_")
    );
  } catch {
    // Directory doesn't exist
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "/api/validate-campaign",
    methods: ["POST"],
    requiredFields: [
      "campaignId",
      "platform",
      "emailSequence",
      "leadList",
      "icpDescription",
    ],
    optionalFields: ["strategistNotes", "clientId"],
    dataFiles: {
      bestPractices: hasBestPractices ? "loaded" : "using_defaults",
      clientContextFiles: clientContextFiles,
    },
    configured: !!process.env.ANTHROPIC_API_KEY,
    responseFormat: {
      score: "number (0-100)",
      status: "pass | needs_review | fail",
      summary: "string",
      issues: "Array<{type, severity, message, details?}>",
      suggestions: "string[]",
      bestPracticesChecked: "string[]",
      clientContextUsed: "boolean",
    },
  });
}
