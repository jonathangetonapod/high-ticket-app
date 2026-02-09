-- Create client_communications table
-- Tracks team ↔ client communication stats via email and Slack

CREATE TABLE IF NOT EXISTS client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  platform TEXT,
  last_email_date TIMESTAMPTZ,
  last_email_subject TEXT,
  last_email_from TEXT,
  emails_7d INTEGER DEFAULT 0,
  emails_30d INTEGER DEFAULT 0,
  meetings_7d INTEGER DEFAULT 0,
  unreplied_count INTEGER DEFAULT 0,
  days_since_contact INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Slack fields
  slack_channel TEXT,
  last_slack_date TIMESTAMPTZ,
  slack_messages_7d INTEGER DEFAULT 0,
  last_slack_from TEXT,
  UNIQUE(client_name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_client_communications_name ON client_communications(client_name);
CREATE INDEX IF NOT EXISTS idx_client_communications_status ON client_communications(status);
CREATE INDEX IF NOT EXISTS idx_client_communications_slack_channel ON client_communications(slack_channel);
CREATE INDEX IF NOT EXISTS idx_client_communications_days_since ON client_communications(days_since_contact DESC);

-- Grant permissions (adjust as needed for your Supabase setup)
-- GRANT ALL ON client_communications TO authenticated;
-- GRANT ALL ON client_communications TO service_role;
