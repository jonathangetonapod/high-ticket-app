import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/invite',
  '/forgot-password',
  '/reset-password',
]

// Routes that require admin role
const ADMIN_ROUTES = [
  '/admin/users',
  '/admin/permissions',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  
  // Check if it's an API route (handle separately)
  const isApiRoute = pathname.startsWith('/api')
  
  // Check if it's a static asset
  const isStaticAsset = pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon') ||
    pathname.includes('.')

  // Skip middleware for static assets
  if (isStaticAsset) {
    return NextResponse.next()
  }

  // Get session from cookie
  const sessionCookie = request.cookies.get('sb-session')
  
  let session: { id: string; role: string } | null = null
  if (sessionCookie?.value) {
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      // Invalid session cookie
    }
  }

  // Handle public routes
  if (isPublicRoute) {
    // If logged in and trying to access login, redirect to home
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // For API routes, let the route handlers check auth
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin routes
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))
  if (isAdminRoute && session.role !== 'admin') {
    // Non-admin trying to access admin routes - redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
