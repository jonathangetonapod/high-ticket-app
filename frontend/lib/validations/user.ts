import { z } from 'zod'

// Schema for POST /api/users (create user)
export const CreateUserSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  role: z.enum(['admin', 'strategist'], {
    message: 'Role must be "admin" or "strategist"',
  }),
})

// Schema for PUT /api/users/[id] (update user)
// At least one field must be provided
export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').max(100).optional(),
  role: z.enum(['admin', 'strategist']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
}).superRefine((data, ctx) => {
  const hasAtLeastOneField = data.email !== undefined || 
    data.name !== undefined || 
    data.role !== undefined || 
    data.password !== undefined
  
  if (!hasAtLeastOneField) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field must be provided for update',
      path: [],
    })
  }
})

// Inferred types
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
