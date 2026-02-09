/**
 * Seed initial admin user for the High-Ticket Strategist Portal
 * 
 * Usage: npx tsx scripts/seed-admin.ts
 * 
 * This script creates the first admin user. Run this after setting up the database.
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('\n🚀 High-Ticket Strategist Portal - Admin Setup\n')
  console.log('This will create the initial admin user.\n')

  // Check if admin already exists
  const { data: existingAdmins, error: checkError } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('role', 'admin')
    .limit(1)

  if (checkError) {
    // Table might not exist yet
    console.log('⚠️  user_profiles table not found. Please run the migration first:')
    console.log('   Go to Supabase Dashboard > SQL Editor and run:')
    console.log('   supabase/migrations/003_auth_rbac_schema.sql\n')
    rl.close()
    process.exit(1)
  }

  if (existingAdmins && existingAdmins.length > 0) {
    console.log(`ℹ️  An admin already exists: ${existingAdmins[0].email}`)
    const proceed = await prompt('Create another admin? (y/n): ')
    if (proceed.toLowerCase() !== 'y') {
      console.log('Cancelled.')
      rl.close()
      process.exit(0)
    }
  }

  // Get admin details
  const email = await prompt('Admin email: ')
  const fullName = await prompt('Full name: ')
  const password = await prompt('Password (min 8 chars): ')

  if (!email || !fullName || !password) {
    console.error('All fields are required.')
    rl.close()
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    rl.close()
    process.exit(1)
  }

  console.log('\nCreating admin user...')

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Failed to create auth user:', authError.message)
    rl.close()
    process.exit(1)
  }

  if (!authData.user) {
    console.error('Failed to create auth user: no user returned')
    rl.close()
    process.exit(1)
  }

  // Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'admin',
    })

  if (profileError) {
    console.error('Failed to create user profile:', profileError.message)
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    rl.close()
    process.exit(1)
  }

  console.log('\n✅ Admin user created successfully!')
  console.log(`   Email: ${email}`)
  console.log(`   Role: Administrator`)
  console.log('\nYou can now log in at /login\n')

  rl.close()
}

main().catch((error) => {
  console.error('Error:', error)
  rl.close()
  process.exit(1)
})
