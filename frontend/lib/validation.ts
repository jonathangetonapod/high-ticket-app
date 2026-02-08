import Anthropic from "@anthropic-ai/sdk";

// Types
export interface Lead {
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  industry?: string;
  companySize?: string;
  linkedinUrl?: string;
  [key: string]: string | undefined;
}

export interface EmailSequence {
  subject: string;
  body: string;
  step: number;
}

export interface CopyValidationResult {
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface LeadValidationResult {
  total: number;
  matched: number;
  flagged: number;
  removed: number;
  issues: string[];
  flaggedLeads?: Array<{ email: string; reason: string }>;
  removedLeads?: Array<{ email: string; reason: string }>;
}

export interface AlignmentResult {
  score: number;
  notes: string;
}

export interface ValidationResult {
  copyValidation: CopyValidationResult;
  leadValidation: LeadValidationResult;
  alignment: AlignmentResult;
}

// Prompt Templates
export const COPY_VALIDATION_PROMPT = `You are an expert email marketing strategist specializing in B2B outbound campaigns.

Analyze the following email sequence against the Ideal Customer Profile (ICP) and strategist notes.

## ICP Description:
{{icpDescription}}

## Strategist Notes:
{{strategistNotes}}

## Email Sequence:
{{emailSequence}}

Evaluate the email copy on these criteria:
1. **Tone Match**: Does the tone match what would resonate with this ICP? (formal vs casual, technical vs simple)
2. **Pain Points**: Does the copy address the specific pain points this ICP would have?
3. **Language/Jargon**: Is industry-appropriate language used? Not too technical or too basic?
4. **Value Proposition**: Is it clear and relevant to this audience?
5. **Call to Action**: Is it appropriate for the relationship stage?
6. **Personalization**: Are there good personalization opportunities?

Return your analysis as JSON:
{
  "score": <0-100>,
  "issues": ["list of specific problems found"],
  "suggestions": ["list of actionable improvements"]
}

Only return valid JSON, no other text.`;

export const LEAD_VALIDATION_PROMPT = `You are an expert B2B lead qualification specialist.

Analyze the following leads against the Ideal Customer Profile (ICP).

## ICP Description:
{{icpDescription}}

## Strategist Notes:
{{strategistNotes}}

## Leads (sample of {{sampleSize}} from {{totalLeads}} total):
{{leadsSample}}

For each lead, determine:
1. **ICP Match**: Does their title, company, and industry match the ICP?
2. **Invalid Email**: Is the email format valid?
3. **Competitor Check**: Could this be a competitor based on company name/industry?
4. **Missing Fields**: Are critical fields (email, name, company) missing?
5. **Title Match**: Does their job title suggest decision-making authority for this product/service?

Return your analysis as JSON:
{
  "matchedCount": <number of leads that match ICP>,
  "flaggedLeads": [
    {"email": "email@example.com", "reason": "Title 'Intern' lacks decision authority"},
    {"email": "invalid-email", "reason": "Invalid email format"}
  ],
  "removedLeads": [
    {"email": "competitor@rival.com", "reason": "Competitor company detected"}
  ],
  "issues": ["general patterns or problems noticed across the list"]
}

Only return valid JSON, no other text.`;

export const ALIGNMENT_PROMPT = `You are an expert B2B campaign strategist.

Analyze whether the email copy and lead list are well-aligned for this campaign.

## ICP Description:
{{icpDescription}}

## Email Sequence Summary:
- Number of emails: {{emailCount}}
- Main topics: {{emailTopics}}
- Tone: {{emailTone}}

## Lead List Summary:
- Total leads: {{totalLeads}}
- Top titles: {{topTitles}}
- Top industries: {{topIndustries}}
- Top company sizes: {{topCompanySizes}}

## Strategist Notes:
{{strategistNotes}}

Consider:
1. Is the email copy speaking to the right audience based on the leads?
2. Are there mismatches between who we're emailing and what we're saying?
3. Could the copy alienate certain segments of the lead list?
4. Is the sophistication level of the copy appropriate for the titles in the list?

Return your analysis as JSON:
{
  "score": <0-100>,
  "notes": "A 2-3 sentence summary of alignment quality and any concerns"
}

Only return valid JSON, no other text.`;

// Helper Functions
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function extractLeadStats(leads: Lead[]): {
  topTitles: string[];
  topIndustries: string[];
  topCompanySizes: string[];
} {
  const titleCounts: Record<string, number> = {};
  const industryCounts: Record<string, number> = {};
  const sizeCounts: Record<string, number> = {};

  leads.forEach((lead) => {
    if (lead.title) {
      titleCounts[lead.title] = (titleCounts[lead.title] || 0) + 1;
    }
    if (lead.industry) {
      industryCounts[lead.industry] = (industryCounts[lead.industry] || 0) + 1;
    }
    if (lead.companySize) {
      sizeCounts[lead.companySize] = (sizeCounts[lead.companySize] || 0) + 1;
    }
  });

  const sortByCount = (counts: Record<string, number>) =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key);

  return {
    topTitles: sortByCount(titleCounts),
    topIndustries: sortByCount(industryCounts),
    topCompanySizes: sortByCount(sizeCounts),
  };
}

export function sampleLeads(leads: Lead[], sampleSize: number = 50): Lead[] {
  if (leads.length <= sampleSize) return leads;

  // Stratified sampling - take from beginning, middle, and end
  const result: Lead[] = [];
  const step = Math.floor(leads.length / sampleSize);

  for (let i = 0; i < sampleSize; i++) {
    result.push(leads[i * step]);
  }

  return result;
}

export function fillTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }
  return result;
}

// Validation Functions
export async function validateCopy(
  client: Anthropic,
  emailSequence: EmailSequence[],
  icpDescription: string,
  strategistNotes: string
): Promise<CopyValidationResult> {
  const emailSequenceText = emailSequence
    .map(
      (e) => `
**Step ${e.step}**
Subject: ${e.subject}
Body:
${e.body}
---`
    )
    .join("\n");

  const prompt = fillTemplate(COPY_VALIDATION_PROMPT, {
    icpDescription,
    strategistNotes: strategistNotes || "None provided",
    emailSequence: emailSequenceText,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text);
  } catch {
    return {
      score: 0,
      issues: ["Failed to parse AI response"],
      suggestions: [],
    };
  }
}

export async function validateLeads(
  client: Anthropic,
  leads: Lead[],
  icpDescription: string,
  strategistNotes: string
): Promise<LeadValidationResult> {
  // Pre-filter obviously invalid leads
  const invalidEmails: Array<{ email: string; reason: string }> = [];
  const missingFields: Array<{ email: string; reason: string }> = [];

  leads.forEach((lead) => {
    if (!lead.email) {
      missingFields.push({ email: "unknown", reason: "Missing email field" });
    } else if (!validateEmailFormat(lead.email)) {
      invalidEmails.push({ email: lead.email, reason: "Invalid email format" });
    }
  });

  // Sample leads for AI analysis
  const validLeads = leads.filter(
    (l) => l.email && validateEmailFormat(l.email)
  );
  const sampledLeads = sampleLeads(validLeads, 50);

  const leadsText = sampledLeads
    .map(
      (l) =>
        `- ${l.email} | ${l.firstName || ""} ${l.lastName || ""} | ${l.title || "N/A"} | ${l.company || "N/A"} | ${l.industry || "N/A"} | ${l.companySize || "N/A"}`
    )
    .join("\n");

  const prompt = fillTemplate(LEAD_VALIDATION_PROMPT, {
    icpDescription,
    strategistNotes: strategistNotes || "None provided",
    sampleSize: sampledLeads.length,
    totalLeads: leads.length,
    leadsSample: leadsText,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const aiResult = JSON.parse(text);

    // Extrapolate from sample to full list
    const sampleMatchRate = aiResult.matchedCount / sampledLeads.length;
    const sampleFlaggedRate =
      (aiResult.flaggedLeads?.length || 0) / sampledLeads.length;

    const estimatedMatched = Math.round(validLeads.length * sampleMatchRate);
    const estimatedFlagged = Math.round(validLeads.length * sampleFlaggedRate);

    return {
      total: leads.length,
      matched: estimatedMatched,
      flagged: estimatedFlagged + invalidEmails.length,
      removed: missingFields.length,
      issues: aiResult.issues || [],
      flaggedLeads: [
        ...invalidEmails,
        ...(aiResult.flaggedLeads || []).slice(0, 10),
      ],
      removedLeads: [
        ...missingFields,
        ...(aiResult.removedLeads || []).slice(0, 10),
      ],
    };
  } catch {
    return {
      total: leads.length,
      matched: 0,
      flagged: invalidEmails.length,
      removed: missingFields.length,
      issues: ["Failed to parse AI response"],
      flaggedLeads: invalidEmails,
      removedLeads: missingFields,
    };
  }
}

export async function validateAlignment(
  client: Anthropic,
  emailSequence: EmailSequence[],
  leads: Lead[],
  icpDescription: string,
  strategistNotes: string
): Promise<AlignmentResult> {
  const stats = extractLeadStats(leads);

  // Extract email characteristics
  const emailTopics = emailSequence.map((e) => e.subject).join(", ");
  const firstEmail = emailSequence[0]?.body || "";
  const emailTone = firstEmail.length > 200 ? "detailed/formal" : "brief/casual";

  const prompt = fillTemplate(ALIGNMENT_PROMPT, {
    icpDescription,
    strategistNotes: strategistNotes || "None provided",
    emailCount: emailSequence.length,
    emailTopics,
    emailTone,
    totalLeads: leads.length,
    topTitles: stats.topTitles.join(", ") || "N/A",
    topIndustries: stats.topIndustries.join(", ") || "N/A",
    topCompanySizes: stats.topCompanySizes.join(", ") || "N/A",
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text);
  } catch {
    return {
      score: 0,
      notes: "Failed to analyze alignment",
    };
  }
}

// Main validation function
export async function runFullValidation(
  emailSequence: EmailSequence[],
  leads: Lead[],
  icpDescription: string,
  strategistNotes: string
): Promise<ValidationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const client = new Anthropic({ apiKey });

  // Run all validations in parallel
  const [copyValidation, leadValidation, alignment] = await Promise.all([
    validateCopy(client, emailSequence, icpDescription, strategistNotes),
    validateLeads(client, leads, icpDescription, strategistNotes),
    validateAlignment(
      client,
      emailSequence,
      leads,
      icpDescription,
      strategistNotes
    ),
  ]);

  return {
    copyValidation,
    leadValidation,
    alignment,
  };
}
