-- Add Slack tracking columns to client_communications table
ALTER TABLE client_communications ADD COLUMN IF NOT EXISTS slack_channel TEXT;
ALTER TABLE client_communications ADD COLUMN IF NOT EXISTS last_slack_date TIMESTAMPTZ;
ALTER TABLE client_communications ADD COLUMN IF NOT EXISTS slack_messages_7d INTEGER DEFAULT 0;
ALTER TABLE client_communications ADD COLUMN IF NOT EXISTS last_slack_from TEXT;

-- Create index for slack channel lookup
CREATE INDEX IF NOT EXISTS idx_client_communications_slack_channel ON client_communications(slack_channel);
