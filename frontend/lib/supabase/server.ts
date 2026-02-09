import { createClient } from '@supabase/supabase-js'

// Handle build-time when env vars aren't available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

let serverClient: ReturnType<typeof createClient> | null = null

export function createServerClient() {
  // Only create real client at runtime when env vars exist
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Return a placeholder during build that will error if actually used
    if (!serverClient) {
      serverClient = createClient(supabaseUrl, supabaseKey)
    }
    return serverClient
  }
  
  if (!serverClient) {
    serverClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return serverClient
}
