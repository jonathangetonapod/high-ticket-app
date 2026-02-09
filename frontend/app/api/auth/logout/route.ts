import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { clearSessionCookie } from '@/lib/session'

export async function POST() {
  try {
    const supabase = createServerClient()
    
    // Sign out from Supabase
    await supabase.auth.signOut()

    // Clear session cookie (new JWT-based session)
    await clearSessionCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Still clear cookies even if Supabase signout fails
    try {
      await clearSessionCookie()
    } catch {
      // Ignore errors during cleanup
    }
    
    return NextResponse.json({ success: true })
  }
}
