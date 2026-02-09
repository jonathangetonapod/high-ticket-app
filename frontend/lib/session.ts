/**
 * JWT Session Management
 * 
 * Secure session handling using signed JWTs instead of base64-encoded JSON.
 * Uses the `jose` library for JWT signing and verification.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// =====================================================
// Types
// =====================================================

export type UserRole = 'admin' | 'strategist' | 'viewer'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface SessionPayload extends JWTPayload {
  user: SessionUser
}

// =====================================================
// Configuration
// =====================================================

const SESSION_COOKIE_NAME = 'session'
const SESSION_EXPIRY = '7d' // 7 days
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7 // 7 days in seconds

// Get the session secret - must be at least 32 characters
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }
  
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long')
  }
  
  return new TextEncoder().encode(secret)
}

// =====================================================
// Session Functions
// =====================================================

/**
 * Sign a session for a user
 * Creates a signed JWT token containing user information
 */
export async function signSession(user: SessionUser): Promise<string> {
  const secret = getSessionSecret()
  
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .setIssuer('high-ticket-strategist-portal')
    .setSubject(user.id)
    .sign(secret)
  
  return token
}

/**
 * Verify session and return user from cookie
 * Returns null if no session or invalid session
 */
export async function verifySession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (!sessionCookie?.value) {
      return null
    }
    
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(sessionCookie.value, secret, {
      issuer: 'high-ticket-strategist-portal',
    })
    
    const sessionPayload = payload as SessionPayload
    
    if (!sessionPayload.user || !sessionPayload.user.id || !sessionPayload.user.email) {
      return null
    }
    
    return sessionPayload.user
  } catch (error) {
    // Token is invalid, expired, or tampered with
    console.error('Session verification failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Get current user from session (alias for verifySession)
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return verifySession()
}

/**
 * Require authentication - throws 401 if not authenticated
 * Use in API routes that need authentication
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await verifySession()
  
  if (!user) {
    throw new AuthError('Authentication required', 401)
  }
  
  return user
}

/**
 * Require admin role - throws 403 if not admin
 * Use in API routes that need admin access
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  
  if (user.role !== 'admin') {
    throw new AuthError('Admin access required', 403)
  }
  
  return user
}

/**
 * Set session cookie
 * Call after successful login
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_SECONDS,
    path: '/',
  })
}

/**
 * Clear session cookie
 * Call on logout
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// =====================================================
// Error Handling
// =====================================================

/**
 * Custom error class for auth errors
 */
export class AuthError extends Error {
  public statusCode: number
  
  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}

/**
 * Handle auth errors in API routes
 * Returns appropriate NextResponse for auth errors
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    )
  }
  
  // Check for SESSION_SECRET configuration error
  if (error instanceof Error && error.message.includes('SESSION_SECRET')) {
    console.error('Session configuration error:', error.message)
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    )
  }
  
  // Re-throw unknown errors
  throw error
}

/**
 * Wrapper for protected API routes
 * Handles auth and returns appropriate error responses
 */
export async function withAuth<T>(
  handler: (user: SessionUser) => Promise<T>,
  options?: { requireAdmin?: boolean }
): Promise<T | NextResponse> {
  try {
    const user = options?.requireAdmin 
      ? await requireAdmin() 
      : await requireAuth()
    return handler(user)
  } catch (error) {
    return handleAuthError(error)
  }
}

// =====================================================
// Role Helpers
// =====================================================

/**
 * Check if user has a specific role
 */
export function hasRole(user: SessionUser | null, role: UserRole): boolean {
  if (!user) return false
  return user.role === role
}

/**
 * Check if user is admin
 */
export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, 'admin')
}

/**
 * Check if user is strategist or higher
 */
export function isStrategistOrAbove(user: SessionUser | null): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'strategist'
}
