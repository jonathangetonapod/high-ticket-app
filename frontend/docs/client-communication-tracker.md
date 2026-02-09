# Client Communication Tracker

Tracks team ↔ client communication via email and Slack.

## Overview

The Client Communication Tracker monitors communication between the team and clients across:
- **Email** - via BridgeKit's `search_emails` tool
- **Slack** - via the Slack API (channel matching by client name)

## Components

### 1. Supabase Table: `client_communications`

Schema:
```sql
CREATE TABLE client_communications (
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
  slack_channel TEXT,
  last_slack_date TIMESTAMPTZ,
  slack_messages_7d INTEGER DEFAULT 0,
  last_slack_from TEXT,
  UNIQUE(client_name)
);
```

### 2. API Endpoint: `/api/client-communications`

- **GET**: Fetch all client communication stats
  - Query params: `filter=all|needs_attention`
  - Returns: `{ success, communications, stats }`

- **POST**: Trigger a refresh
  - Loops through all clients
  - Searches emails via BridgeKit
  - Searches Slack channels
  - Upserts to `client_communications` table
  - Creates insights for clients needing attention (7+ days no contact)

### 3. UI Component

Located in Communications page → "Team ↔ Client" tab

Shows:
- Client name with platform badge
- Slack channel (if matched)
- Email count (7d)
- Slack message count (7d)
- Days since last contact
- Status badge (Active/Needs Attention/Critical)

## Cron Job Setup

### OpenClaw Cron Configuration

Create a cron job in OpenClaw to run daily at 10am EST (15:00 UTC):

```
Name: Client Communication Tracker
Schedule: 0 15 * * *  (daily at 15:00 UTC = 10:00 AM EST)
```

**Cron Task:**
```
POST to the high-ticket app's /api/client-communications endpoint to trigger a refresh.
After the refresh, check the results and create insights for clients with no contact in 7+ days.
Report summary: X clients processed, Y need attention.
```

### Manual Trigger

The refresh can also be triggered manually via the "Refresh Data" button in the UI.

## Slack Channel Matching

The system matches clients to Slack channels using this naming convention:
- Client name: "Emily Journey"
- Expected channel: `#client-emily-journey`

## Status Definitions

- **Active**: Contact within last 7 days
- **Needs Attention**: No contact for 7-13 days
- **Critical**: No contact for 14+ days

## Insights Integration

When clients need attention (7+ days no contact), insights are created in the `daily_insights` table:
- `insight_type: 'client_communication'`
- Priority: 'high' for critical (14+ days), 'normal' otherwise
