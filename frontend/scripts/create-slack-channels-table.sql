-- Store all Slack channels for dropdown selection
CREATE TABLE IF NOT EXISTS slack_channels (
  id TEXT PRIMARY KEY,  -- Slack channel ID (e.g., C09TV3W4V55)
  name TEXT NOT NULL,
  type TEXT,  -- public_channel, private_channel
  member_count INTEGER,
  is_client_channel BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slack_channels_name ON slack_channels(name);
CREATE INDEX IF NOT EXISTS idx_slack_channels_client ON slack_channels(is_client_channel);
