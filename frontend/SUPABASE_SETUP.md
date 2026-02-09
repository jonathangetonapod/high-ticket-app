# Supabase Integration Setup

This document describes how to complete the Supabase integration for the High-Ticket Strategist Portal.

## Files Created

### Supabase Client Libraries
- `lib/supabase/client.ts` - Browser client (uses anon key)
- `lib/supabase/server.ts` - Server client (uses service role key)

### Database Schema
- `supabase/migrations/001_initial_schema.sql` - Initial database tables

### Setup Scripts
- `scripts/setup-supabase.ts` - Verifies database setup
- `scripts/run-migration-pg.ts` - Runs migration via PostgreSQL connection
- `scripts/migrate-to-supabase.ts` - Migrates existing JSON data to Supabase

### Updated API Routes
- `lib/submissions.ts` - Now uses Supabase (was JSON file)
- `app/api/clients/[id]/context/route.ts` - Now uses Supabase
- `app/api/admin/best-practices/route.ts` - Now uses Supabase
- `app/api/admin/best-practices/[id]/route.ts` - Now uses Supabase
- `app/api/submissions/route.ts` - Updated for async functions
- `app/api/submissions/[id]/route.ts` - Updated for async functions

## Setup Steps

### Step 1: Run the Database Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to: https://app.supabase.com/project/guaqpdjqxdtftzodzdsd/sql/new
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click "Run"

**Option B: Via PostgreSQL Connection**

1. Get your database connection string from Supabase:
   - Go to: https://app.supabase.com/project/guaqpdjqxdtftzodzdsd/settings/database
   - Copy the "URI" connection string
2. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@...
   ```
3. Run: `npx tsx scripts/run-migration-pg.ts`

### Step 2: Migrate Existing Data

After the tables are created, run:

```bash
npx tsx scripts/migrate-to-supabase.ts
```

This will:
- Migrate submissions from `data/submissions/submissions.json`
- Migrate client context from `data/client-context/*.json`
- Migrate best practices from `data/best-practices.json`

### Step 3: Verify Setup

```bash
npx tsx scripts/setup-supabase.ts
```

This will verify all tables exist and are accessible.

## Database Schema

### submissions
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (e.g., SUB-xxxx) |
| client_id | TEXT | Client identifier |
| client_name | TEXT | Client display name |
| platform | TEXT | 'bison' or 'instantly' |
| campaigns | JSONB | Array of campaign objects |
| validation_results | JSONB | Validation scores and issues |
| strategist_notes | TEXT | Notes from strategist |
| status | TEXT | pending/approved/rejected/launched |
| submitted_by | TEXT | Strategist who submitted |
| submitted_at | TIMESTAMPTZ | Submission timestamp |
| reviewed_by | TEXT | Admin who reviewed |
| reviewed_at | TIMESTAMPTZ | Review timestamp |
| review_notes | TEXT | Admin review notes |

### client_context
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | TEXT | Unique client identifier |
| client_name | TEXT | Client display name |
| icp_summary | TEXT | ICP markdown content |
| special_requirements | TEXT | Special requirements markdown |
| transcript_notes | TEXT | Transcript notes markdown |

### best_practices
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| title | TEXT | Guide title |
| category | TEXT | Guide category |
| content | TEXT | Markdown content |

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://guaqpdjqxdtftzodzdsd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Optional (for PostgreSQL migration script):
```
DATABASE_URL=postgresql://...
```
