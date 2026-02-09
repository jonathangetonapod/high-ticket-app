/**
 * Data Migration Script: JSON files -> Supabase
 * 
 * Run with: npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
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

  console.log('🔗 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const dataDir = join(process.cwd(), 'data')

  // ========================================
  // 1. Migrate Submissions
  // ========================================
  console.log('\n📦 Migrating submissions...')
  const submissionsFile = join(dataDir, 'submissions', 'submissions.json')
  
  if (existsSync(submissionsFile)) {
    try {
      const submissionsData = JSON.parse(readFileSync(submissionsFile, 'utf-8'))
      
      if (Array.isArray(submissionsData) && submissionsData.length > 0) {
        // Transform submissions to match Supabase schema
        const submissions = submissionsData.map((s: any) => ({
          id: s.id,
          client_id: s.clientId,
          client_name: s.clientName,
          platform: s.platform,
          campaigns: s.campaigns,
          validation_results: s.validationResults,
          strategist_notes: s.strategistNotes,
          status: s.status,
          submitted_by: s.submittedBy,
          submitted_at: s.submittedAt,
          reviewed_by: s.reviewedBy || null,
          reviewed_at: s.reviewedAt || null,
          review_notes: s.reviewNotes || null,
        }))

        const { error } = await supabase
          .from('submissions')
          .upsert(submissions, { onConflict: 'id' })

        if (error) {
          console.log(`   ❌ Error: ${error.message}`)
        } else {
          console.log(`   ✅ Migrated ${submissions.length} submissions`)
        }
      } else {
        console.log('   ℹ️  No submissions to migrate (empty array)')
      }
    } catch (err) {
      console.log(`   ❌ Error reading submissions: ${err}`)
    }
  } else {
    console.log('   ℹ️  No submissions file found')
  }

  // ========================================
  // 2. Migrate Client Context
  // ========================================
  console.log('\n📦 Migrating client context...')
  const contextDir = join(dataDir, 'client-context')
  
  if (existsSync(contextDir)) {
    const files = readdirSync(contextDir).filter(f => f.endsWith('.json') && !f.startsWith('_'))
    
    for (const file of files) {
      try {
        const filePath = join(contextDir, file)
        const context = JSON.parse(readFileSync(filePath, 'utf-8'))
        
        const { error } = await supabase
          .from('client_context')
          .upsert({
            client_id: context.clientId,
            client_name: context.clientName,
            icp_summary: context.icpSummary || null,
            special_requirements: context.specialRequirements || null,
            transcript_notes: context.transcriptNotes || null,
            updated_at: context.updatedAt || new Date().toISOString(),
          }, { onConflict: 'client_id' })

        if (error) {
          console.log(`   ❌ ${file}: ${error.message}`)
        } else {
          console.log(`   ✅ Migrated ${context.clientName || file}`)
        }
      } catch (err) {
        console.log(`   ❌ Error reading ${file}: ${err}`)
      }
    }
    
    if (files.length === 0) {
      console.log('   ℹ️  No client context files found')
    }
  } else {
    console.log('   ℹ️  No client-context directory found')
  }

  // ========================================
  // 3. Migrate Best Practices
  // ========================================
  console.log('\n📦 Migrating best practices...')
  const bestPracticesFile = join(dataDir, 'best-practices.json')
  
  if (existsSync(bestPracticesFile)) {
    try {
      const data = JSON.parse(readFileSync(bestPracticesFile, 'utf-8'))
      const guides = data.guides || []
      
      if (guides.length > 0) {
        // Transform guides to match Supabase schema
        const practices = guides.map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          content: g.content,
          updated_at: g.updatedAt || new Date().toISOString(),
        }))

        const { error } = await supabase
          .from('best_practices')
          .upsert(practices, { onConflict: 'id' })

        if (error) {
          console.log(`   ❌ Error: ${error.message}`)
        } else {
          console.log(`   ✅ Migrated ${practices.length} best practice guides`)
        }
      } else {
        console.log('   ℹ️  No guides to migrate')
      }
    } catch (err) {
      console.log(`   ❌ Error reading best practices: ${err}`)
    }
  } else {
    console.log('   ℹ️  No best-practices.json file found')
  }

  // ========================================
  // Summary
  // ========================================
  console.log('\n🎉 Migration complete!')
  console.log('')
  console.log('Verify data in Supabase Dashboard:')
  console.log('   https://app.supabase.com/project/guaqpdjqxdtftzodzdsd/editor')
}

main().catch(console.error)
