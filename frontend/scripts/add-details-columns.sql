-- Add columns for more email details
ALTER TABLE client_communications 
ADD COLUMN IF NOT EXISTS recent_emails JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS email_snippet TEXT,
ADD COLUMN IF NOT EXISTS recent_senders TEXT[];
