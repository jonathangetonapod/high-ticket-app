import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    // Return a proxy that will throw if methods are called during SSR
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get() {
        throw new Error('Supabase client cannot be used during server-side rendering')
      }
    })
  }

  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return client
}
