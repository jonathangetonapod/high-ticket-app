import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simplified middleware - just handle static assets
// Auth is handled by AuthProvider on client side
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static assets and API routes
  const isStaticAsset = pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  
  if (isStaticAsset) {
    return NextResponse.next()
  }

  // Let all other requests through - AuthProvider handles auth
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
