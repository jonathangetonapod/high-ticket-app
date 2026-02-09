-- Team Performance Metrics Table
-- Stores daily snapshots of performance metrics for historical tracking

CREATE TABLE IF NOT EXISTS team_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  value DECIMAL(15, 4) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'combined', -- 'instantly', 'bison', 'slack', 'combined'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint for upserts
  CONSTRAINT unique_daily_metric UNIQUE (date, metric_type, source)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_team_metrics_date ON team_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_team_metrics_type ON team_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_team_metrics_source ON team_metrics(source);
CREATE INDEX IF NOT EXISTS idx_team_metrics_date_type ON team_metrics(date DESC, metric_type);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_team_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_metrics_updated_at ON team_metrics;
CREATE TRIGGER team_metrics_updated_at
  BEFORE UPDATE ON team_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_team_metrics_updated_at();

-- Enable Row Level Security (optional, adjust policies as needed)
ALTER TABLE team_metrics ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read metrics
CREATE POLICY "Allow authenticated read access to team_metrics"
  ON team_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy to allow service role full access
CREATE POLICY "Allow service role full access to team_metrics"
  ON team_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE team_metrics IS 'Daily snapshots of team performance metrics from Instantly, Bison, and other sources';
COMMENT ON COLUMN team_metrics.metric_type IS 'Type of metric: emails_sent, open_rate, reply_rate, positive_reply_rate, meetings_booked, campaigns_launched';
COMMENT ON COLUMN team_metrics.source IS 'Data source: instantly, bison, slack, combined';
COMMENT ON COLUMN team_metrics.metadata IS 'Additional JSON data like breakdown by client or campaign';
