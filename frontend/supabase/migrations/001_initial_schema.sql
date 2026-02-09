-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('bison', 'instantly')),
  campaigns JSONB NOT NULL DEFAULT '[]',
  validation_results JSONB,
  strategist_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'launched')),
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client context table
CREATE TABLE IF NOT EXISTS client_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  icp_summary TEXT,
  special_requirements TEXT,
  transcript_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Best practices table
CREATE TABLE IF NOT EXISTS best_practices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_practices ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now since we're using service role)
CREATE POLICY "Allow all for submissions" ON submissions FOR ALL USING (true);
CREATE POLICY "Allow all for client_context" ON client_context FOR ALL USING (true);
CREATE POLICY "Allow all for best_practices" ON best_practices FOR ALL USING (true);
