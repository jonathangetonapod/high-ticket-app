/**
 * Run SQL Migration via direct PostgreSQL connection
 * 
 * Run with: npx tsx scripts/run-migration-pg.ts
 * 
 * Requires DATABASE_URL in .env.local:
 *   Get it from: https://app.supabase.com/project/<project>/settings/database
 *   Use the "Session mode" connection string from the Pooler section
 */

import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const projectRef = supabaseUrl?.replace('https://', '').split('.')[0] || '<project-ref>'
    
    console.error('❌ Missing DATABASE_URL in .env.local')
    console.log('')
    console.log('To get your DATABASE_URL:')
    console.log(`1. Go to: https://app.supabase.com/project/${projectRef}/settings/database`)
    console.log('2. In the "Connection string" section, select "URI"')
    console.log('3. Copy the connection string')
    console.log('4. Add to .env.local: DATABASE_URL=<connection-string>')
    console.log('')
    console.log('Or run the migration manually in the SQL Editor:')
    console.log(`   https://app.supabase.com/project/${projectRef}/sql/new`)
    console.log('')
    console.log('SQL file: supabase/migrations/001_initial_schema.sql')
    process.exit(1)
  }

  console.log('🔗 Connecting to Supabase database...')

  const client = new Client({ connectionString })
  
  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📦 Running database migration...')
    
    // Execute the migration
    await client.query(sql)
    
    console.log('✅ Migration executed successfully!')
    
    // Verify tables exist
    console.log('\n📊 Verifying tables...')
    
    const tables = ['submissions', 'client_context', 'best_practices']
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [table]
      )
      if (result.rows[0].exists) {
        console.log(`   ✅ Table '${table}' exists`)
      } else {
        console.log(`   ❌ Table '${table}' NOT found`)
      }
    }

    console.log('\n🎉 Database setup complete!')
    console.log('')
    console.log('Next: npx tsx scripts/migrate-to-supabase.ts')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
