-- Daily insights table for agent-generated reports
CREATE TABLE IF NOT EXISTS daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  insight_type TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT,
  platform TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daily_insights_date ON daily_insights(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_insights_type ON daily_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_daily_insights_client ON daily_insights(client_name);

-- Enable RLS
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (service role)
CREATE POLICY "Allow all for service role" ON daily_insights
  FOR ALL
  USING (true)
  WITH CHECK (true);
