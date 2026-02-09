-- Slack channel manual mappings
-- Use this to override fuzzy matching with exact channel assignments

CREATE TABLE IF NOT EXISTS slack_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL UNIQUE,
  slack_channel_id TEXT NOT NULL,
  slack_channel_name TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_slack_mapping_client ON slack_channel_mappings(client_name);
CREATE INDEX IF NOT EXISTS idx_slack_mapping_channel ON slack_channel_mappings(slack_channel_id);

COMMENT ON TABLE slack_channel_mappings IS 'Manual Slack channel assignments for clients (overrides fuzzy matching)';
