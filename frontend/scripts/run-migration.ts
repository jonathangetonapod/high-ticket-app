/**
 * Run SQL Migration via Supabase Management API
 * 
 * Run with: npx tsx scripts/run-migration.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  
  console.log(`🔗 Project: ${projectRef}`)
  console.log('📦 Running database migration...')

  // Read the migration SQL file
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  // Execute SQL using the Supabase REST API's RPC endpoint
  // We'll create a function first, then execute it
  
  // Alternative: Use the query endpoint directly
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    // Try alternative approach - direct PostgreSQL REST
    console.log('⚠️  exec_sql function not available.')
    console.log('')
    console.log('Please run the migration manually:')
    console.log('')
    console.log('1. Go to Supabase Dashboard → SQL Editor:')
    console.log(`   https://app.supabase.com/project/${projectRef}/sql/new`)
    console.log('')
    console.log('2. Paste the following SQL and click "Run":')
    console.log('')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    console.log('')
    console.log('3. Then run: npx tsx scripts/migrate-to-supabase.ts')
    return
  }

  console.log('✅ Migration executed successfully!')
  console.log('')
  console.log('Next: npx tsx scripts/migrate-to-supabase.ts')
}

main().catch(console.error)
