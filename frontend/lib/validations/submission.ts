import { z } from 'zod'

// Validation issue schema
const ValidationIssueSchema = z.object({
  type: z.string().optional(),
  message: z.string(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
})

// Validation score schema
const ValidationScoreSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.union([z.string(), ValidationIssueSchema])).default([]),
})

// Campaign in submission - accepts both camelCase and snake_case
const SubmissionCampaignSchema = z.preprocess(
  (val) => {
    // Normalize snake_case to camelCase
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>
      return {
        campaignId: obj.campaignId || obj.campaign_id,
        campaignName: obj.campaignName || obj.campaign_name,
        leadCount: obj.leadCount ?? obj.lead_count ?? 0,
      }
    }
    return val
  },
  z.object({
    campaignId: z.string().min(1, 'Campaign ID is required'),
    campaignName: z.string().min(1, 'Campaign name is required'),
    leadCount: z.number().int().min(0).default(0),
  })
)

// Validation results
const ValidationResultsSchema = z.object({
  emailCopy: ValidationScoreSchema.optional().default({ score: 0, issues: [] }),
  leadList: ValidationScoreSchema.optional().default({ score: 0, issues: [] }),
  mailboxHealth: ValidationScoreSchema.optional().default({ score: 0, issues: [] }),
})

// Main submission schema for POST /api/submissions
export const CreateSubmissionSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientName: z.string().min(1, 'Client name is required'),
  platform: z.enum(['bison', 'instantly'], {
    message: 'Platform must be "bison" or "instantly"',
  }),
  campaigns: z.array(SubmissionCampaignSchema).min(1, 'At least one campaign is required'),
  validationResults: ValidationResultsSchema,
  strategistNotes: z.string().optional().default(''),
  submittedBy: z.string().min(1, 'Submitted by is required'),
})

// Schema for updating submission status
export const UpdateSubmissionSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'launched']).optional(),
  reviewNotes: z.string().optional(),
  reviewedBy: z.string().optional(),
})

// Inferred types
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionSchema>
