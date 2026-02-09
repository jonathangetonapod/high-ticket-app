/**
 * Rate Limiting
 * 
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window algorithm for fair rate limiting.
 * 
 * Note: This is per-instance. For multi-instance deployments,
 * use Redis-based rate limiting with @upstash/ratelimit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// =====================================================
// Types
// =====================================================

interface RateLimitEntry {
  requests: number[]
  blocked: boolean
  blockedUntil?: number
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
  /** Optional: block duration after limit is exceeded (seconds) */
  blockDurationSeconds?: number
  /** Optional: custom identifier function */
  getIdentifier?: (request: NextRequest) => string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// =====================================================
// In-Memory Store
// =====================================================

// Map of identifier -> rate limit entry
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupOldEntries(windowMs: number): void {
  const now = Date.now()
  
  // Only run cleanup every 5 minutes
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return
  }
  
  lastCleanup = now
  const cutoff = now - windowMs - 60000 // Add 1 minute buffer
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries with no recent requests
    const hasRecentRequests = entry.requests.some(ts => ts > cutoff)
    
    // Also check if block has expired
    const blockExpired = !entry.blocked || (entry.blockedUntil && entry.blockedUntil < now)
    
    if (!hasRecentRequests && blockExpired) {
      rateLimitStore.delete(key)
    }
  }
}

// =====================================================
// Rate Limiter Implementation
// =====================================================

/**
 * Check rate limit for a request
 */
function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const windowStart = now - windowMs
  
  // Run cleanup periodically
  cleanupOldEntries(windowMs)
  
  // Get or create entry
  let entry = rateLimitStore.get(identifier)
  
  if (!entry) {
    entry = { requests: [], blocked: false }
    rateLimitStore.set(identifier, entry)
  }
  
  // Check if currently blocked
  if (entry.blocked && entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset: Math.ceil(entry.blockedUntil / 1000),
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      }
    }
    // Block expired, reset
    entry.blocked = false
    entry.blockedUntil = undefined
    entry.requests = []
  }
  
  // Filter to only requests within the current window
  entry.requests = entry.requests.filter(ts => ts > windowStart)
  
  // Check if over limit
  if (entry.requests.length >= config.limit) {
    // Apply block if configured
    if (config.blockDurationSeconds) {
      entry.blocked = true
      entry.blockedUntil = now + (config.blockDurationSeconds * 1000)
    }
    
    // Find when the oldest request in window will expire
    const oldestRequest = Math.min(...entry.requests)
    const resetTime = oldestRequest + windowMs
    
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil(resetTime / 1000),
      retryAfter: Math.ceil((resetTime - now) / 1000),
    }
  }
  
  // Add this request
  entry.requests.push(now)
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.requests.length,
    reset: Math.ceil((now + windowMs) / 1000),
  }
}

/**
 * Get client IP from request
 */
export async function getClientIP(request: NextRequest): Promise<string> {
  // Try headers first (for proxied requests)
  const headersList = await headers()
  
  // Check various proxy headers
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = headersList.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }
  
  // Fall back to request IP (might not work in all environments)
  // Use a hash of the user-agent + accept-language as fallback
  const userAgent = headersList.get('user-agent') || 'unknown'
  const acceptLanguage = headersList.get('accept-language') || 'unknown'
  return `fallback-${hashString(userAgent + acceptLanguage)}`
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// =====================================================
// Pre-configured Rate Limiters
// =====================================================

/**
 * Rate limiter for login attempts
 * 5 attempts per minute, blocks for 5 minutes after
 */
export const loginRateLimiter = {
  config: {
    limit: 5,
    windowSeconds: 60,
    blockDurationSeconds: 5 * 60, // 5 minute block
  } as RateLimitConfig,
  
  async check(request: NextRequest): Promise<RateLimitResult> {
    const ip = await getClientIP(request)
    const identifier = `login:${ip}`
    return checkRateLimit(identifier, this.config)
  },
}

/**
 * Rate limiter for process-leads endpoint
 * 10 requests per minute
 */
export const processLeadsRateLimiter = {
  config: {
    limit: 10,
    windowSeconds: 60,
  } as RateLimitConfig,
  
  async check(request: NextRequest): Promise<RateLimitResult> {
    const ip = await getClientIP(request)
    const identifier = `process-leads:${ip}`
    return checkRateLimit(identifier, this.config)
  },
}

/**
 * Rate limiter for validate-campaign endpoint
 * 20 requests per minute
 */
export const validateCampaignRateLimiter = {
  config: {
    limit: 20,
    windowSeconds: 60,
  } as RateLimitConfig,
  
  async check(request: NextRequest): Promise<RateLimitResult> {
    const ip = await getClientIP(request)
    const identifier = `validate-campaign:${ip}`
    return checkRateLimit(identifier, this.config)
  },
}

/**
 * Rate limiter for extract-icp endpoint
 * 10 requests per minute
 */
export const extractICPRateLimiter = {
  config: {
    limit: 10,
    windowSeconds: 60,
  } as RateLimitConfig,
  
  async check(request: NextRequest): Promise<RateLimitResult> {
    const ip = await getClientIP(request)
    const identifier = `extract-icp:${ip}`
    return checkRateLimit(identifier, this.config)
  },
}

// =====================================================
// Response Helpers
// =====================================================

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
      },
    }
  )
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    config,
    async check(request: NextRequest): Promise<RateLimitResult> {
      const identifier = config.getIdentifier
        ? config.getIdentifier(request)
        : await getClientIP(request)
      return checkRateLimit(identifier, config)
    },
  }
}
