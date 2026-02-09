import { z } from 'zod'

// Schema for PUT /api/clients/[id]/context (create/update client context)
export const ClientContextSchema = z.object({
  clientName: z.string()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be 200 characters or less')
    .optional(),
  icpSummary: z.string()
    .max(10000, 'ICP summary must be 10,000 characters or less')
    .optional()
    .default(''),
  specialRequirements: z.string()
    .max(10000, 'Special requirements must be 10,000 characters or less')
    .optional()
    .default(''),
  transcriptNotes: z.string()
    .max(50000, 'Transcript notes must be 50,000 characters or less')
    .optional()
    .default(''),
  // Communication tracking fields
  clientEmail: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  slackChannelId: z.string()
    .max(50, 'Slack channel ID must be 50 characters or less')
    .optional()
    .default(''),
  slackChannelName: z.string()
    .max(100, 'Slack channel name must be 100 characters or less')
    .optional()
    .default(''),
})

// Inferred type
export type ClientContextInput = z.infer<typeof ClientContextSchema>
