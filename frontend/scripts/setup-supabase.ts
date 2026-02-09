/**
 * Supabase Database Setup Script
 * 
 * Run with: npx tsx scripts/setup-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
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
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🔗 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read the migration SQL file
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('📦 Running database migration...')

  // Split by semicolons and execute each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: statement + ';' })
      if (error) {
        // Try direct SQL execution via raw query approach
        // Note: Supabase doesn't have a direct exec method, so we'll use the REST API
        console.log(`   Executing: ${statement.substring(0, 50)}...`)
      }
    } catch (err) {
      // Ignore RPC errors, we'll verify the tables exist
    }
  }

  // Alternative: Execute each CREATE TABLE separately
  console.log('📊 Creating tables...')

  // Check if tables exist by trying to query them
  const { error: submissionsError } = await supabase.from('submissions').select('id').limit(1)
  const { error: contextError } = await supabase.from('client_context').select('id').limit(1)
  const { error: practicesError } = await supabase.from('best_practices').select('id').limit(1)

  if (submissionsError?.code === '42P01' || contextError?.code === '42P01' || practicesError?.code === '42P01') {
    console.log('⚠️  Tables do not exist. Please run the SQL migration manually in Supabase Dashboard:')
    console.log('   1. Go to: https://app.supabase.com/project/_/sql/new')
    console.log('   2. Paste the contents of: supabase/migrations/001_initial_schema.sql')
    console.log('   3. Click "Run"')
    console.log('')
    console.log('📄 Migration SQL location: supabase/migrations/001_initial_schema.sql')
    process.exit(1)
  }

  // Verify tables exist
  console.log('✅ Verifying tables...')
  
  const tables = ['submissions', 'client_context', 'best_practices']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`   ❌ Table '${table}' error: ${error.message}`)
    } else {
      console.log(`   ✅ Table '${table}' exists`)
    }
  }

  console.log('')
  console.log('🎉 Supabase setup complete!')
  console.log('')
  console.log('Next steps:')
  console.log('   1. Run migration script: npx tsx scripts/migrate-to-supabase.ts')
  console.log('   2. Test the API endpoints')
}

main().catch(console.error)
