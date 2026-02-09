/**
 * Standardized API Response Format
 * 
 * All API routes should use these utilities for consistent response structure.
 */

import { NextResponse } from 'next/server'
import { ZodError, ZodIssue } from 'zod'

// Generic API Response interface
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errors?: Array<{ field: string; message: string }>
  meta?: {
    page?: number
    limit?: number
    total?: number
    pages?: number
  }
}

// Pagination metadata
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta'],
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  }
  
  if (meta) {
    response.meta = meta
  }
  
  return NextResponse.json(response, { status })
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  fieldErrors?: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  const response: ApiResponse<never> = {
    success: false,
    error,
  }
  
  if (fieldErrors && fieldErrors.length > 0) {
    response.errors = fieldErrors
  }
  
  return NextResponse.json(response, { status })
}

/**
 * Handle Zod validation errors and return proper 400 response
 */
export function validationErrorResponse(
  zodError: ZodError
): NextResponse<ApiResponse<never>> {
  const fieldErrors = zodError.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
  
  const errorMessage = fieldErrors.length === 1
    ? fieldErrors[0].message
    : `Validation failed: ${fieldErrors.length} errors`
  
  return errorResponse(errorMessage, 400, fieldErrors)
}

/**
 * Parse and validate pagination query params
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number = 50,
  maxLimit: number = 100
): { page: number; limit: number; offset: number } {
  let page = parseInt(searchParams.get('page') || '1', 10)
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10)
  
  // Validate page
  if (isNaN(page) || page < 1) {
    page = 1
  }
  
  // Validate limit
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit
  }
  if (limit > maxLimit) {
    limit = maxLimit
  }
  
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  }
}
