import { z } from 'zod'

// Valid categories for best practices/guides
const VALID_CATEGORIES = [
  'email-copy',
  'lead-validation', 
  'mailbox-health',
  'client-onboarding',
  'campaign-strategy',
  'troubleshooting',
  'general',
] as const

// Schema for POST /api/admin/best-practices (create guide)
export const CreateBestPracticeSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be 50 characters or less'),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be 50,000 characters or less'),
})

// Schema for PUT /api/admin/best-practices/[id] (update guide)
export const UpdateBestPracticeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(50).optional(),
  content: z.string().min(1).max(50000).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)

// Inferred types
export type CreateBestPracticeInput = z.infer<typeof CreateBestPracticeSchema>
export type UpdateBestPracticeInput = z.infer<typeof UpdateBestPracticeSchema>

// Export valid categories for reference
export { VALID_CATEGORIES }
