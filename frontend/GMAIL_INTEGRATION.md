# Gmail Integration - Strategy Call Context

## 🎯 What We Built

I've integrated Gmail email search and thread viewing into the **Strategy Call** step of the submission flow. This allows strategists to:

1. **Search Jay's Gmail** for emails with the client
2. **View complete email threads** with full conversation history
3. **Extract all context** including:
   - Strategy call follow-ups
   - Intake form links
   - ICP requirements
   - Value propositions
   - Pain points
   - Campaign goals
   - Timeline discussions

## 📸 Visual Flow

### Step 1: Select Client
- Strategist selects the client from dropdown
- Client info auto-populates (platform, workspace ID)

### Step 2: Search Email Threads
- **Search box** appears with quick search shortcuts:
  - `from:[client name]` - Emails from the client
  - `subject:strategy OR intake` - Strategy call related emails
  - `Last 30 days` - Recent communications

### Step 3: View Search Results
- Cards display matching email threads:
  - Subject line
  - From/To
  - Date
  - Snippet preview
  - Click to view full thread

### Step 4: View Complete Thread
- Expandable thread viewer shows:
  - All messages in chronological order
  - Full email bodies (not just snippets)
  - Sender/recipient details
  - Timestamps
  - Complete context for AI validation

### Step 5: Validate with AI
- AI analyzes:
  - Email thread content
  - Intake form URLs (if mentioned)
  - ICP details from conversations
  - Campaign requirements
  - Client's value proposition
  - Pain points discussed

## 🎨 Design Features

### Search Interface (Blue gradient card)
```
┌─────────────────────────────────────────────────────┐
│ 📧 Search Client Email Threads                     │
│                                                     │
│ Search Jay's Gmail for emails with [Client Name]   │
│                                                     │
│ [🔍 Search input: from:client@example.com]  [Go]  │
│                                                     │
│ Quick shortcuts:                                    │
│ [from:john] [subject:strategy] [Last 30 days]      │
│                                                     │
│ Found 3 email threads:                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ Strategy Call Follow-up - Lead Gen Campaign │   │
│ │ 👤 John Smith <john@acme.com>               │   │
│ │ 📅 Jan 25, 2026                             │   │
│ │ Thanks for the great strategy call...       │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Thread Viewer (White card with blue border)
```
┌─────────────────────────────────────────────────────┐
│ 💬 Email Thread (5 messages)              [✕ Close] │
│ Complete conversation context for validation        │
├─────────────────────────────────────────────────────┤
│ ┌─ Message 1 ──────────────────────────────────┐   │
│ │ From: john@acmecorp.com                      │   │
│ │ To: jay@leadgenjay.com                       │   │
│ │ Date: Jan 20, 2026 10:30 AM                  │   │
│ │                                              │   │
│ │ Hi Jay,                                      │   │
│ │ I'm reaching out about a lead generation... │   │
│ │ Our ideal customer profile:                 │   │
│ │ - Company size: 50-500 employees            │   │
│ │ - Industry: B2B SaaS                        │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ Message 2 ──────────────────────────────────┐   │
│ │ From: jay@leadgenjay.com                     │   │
│ │ To: john@acmecorp.com                        │   │
│ │ Date: Jan 20, 2026 3:45 PM                   │   │
│ │                                              │   │
│ │ Thanks for reaching out! Please complete... │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 🔧 Technical Implementation

### Frontend (`/app/submissions/new/page.tsx`)
- Gmail search state management
- Email thread viewer with full message display
- Quick search shortcuts (badges)
- Loading states for search and thread loading
- Responsive design with max-height scrolling

### API Routes

#### `/api/gmail/search` (GET)
**Query Params:**
- `query` - Gmail search query (required)
- `maxResults` - Number of results (default: 20)
- `account` - Email account to search

**Response:**
```json
{
  "success": true,
  "query": "from:john@acmecorp.com",
  "count": 3,
  "results": [
    {
      "id": "message-id",
      "thread_id": "thread-id",
      "from": "John Smith <john@acmecorp.com>",
      "subject": "Strategy Call Follow-up",
      "date": "2026-01-25T14:30:00",
      "snippet": "Thanks for the great strategy call...",
      "labels": ["INBOX", "IMPORTANT"]
    }
  ]
}
```

#### `/api/gmail/thread` (GET)
**Query Params:**
- `threadId` - Gmail thread ID (required)
- `account` - Email account to use

**Response:**
```json
{
  "success": true,
  "thread_id": "thread-id",
  "message_count": 5,
  "account_used": "jay@leadgenjay.com",
  "messages": [
    {
      "id": "message-id",
      "from": "john@acmecorp.com",
      "to": "jay@leadgenjay.com",
      "subject": "Lead Gen Campaign Inquiry",
      "date": "2026-01-20T10:30:00",
      "body": "Full email body with ICP details...",
      "snippet": "Short preview...",
      "labels": ["INBOX"]
    }
  ]
}
```

## 🔐 Gmail Authentication (Next Step)

To connect to real Gmail data, strategists will need to:

1. **OAuth Sign-in** - Click "Connect Gmail" button
2. **Grant Permissions** - Allow read access to Jay's Gmail
3. **Token Storage** - Store OAuth tokens securely (server-side)
4. **API Calls** - Use tokens to call BridgeKit MCP Gmail tools

### Authentication Flow (To Implement)
```
User clicks "Connect Gmail"
  ↓
Redirect to Google OAuth
  ↓
User grants permission
  ↓
Receive OAuth token
  ↓
Store token (server-side, encrypted)
  ↓
Use token for MCP Gmail tool calls
```

## 📊 Current Status

✅ **Complete:**
- UI for Gmail search
- Thread viewer with full messages
- Quick search shortcuts
- Loading states
- Mock data for development

⏳ **Next Steps:**
1. Add "Connect Gmail" authentication flow
2. Wire up real BridgeKit MCP tools (`search_emails`, `get_email_thread`)
3. Store OAuth tokens securely
4. Handle token refresh
5. Error handling for API failures

## 🎯 Benefits

1. **Rich Context** - AI gets full conversation history, not just meeting ID
2. **No Manual Entry** - Automatically extracts ICP, pain points, requirements
3. **Verification** - Ensures strategist actually communicated with client
4. **Audit Trail** - Complete email history for reference
5. **Better Validation** - AI can cross-reference emails with campaigns

## 🚀 Try It Out

Visit: **http://localhost:3000/submissions/new**

1. Select a client (e.g., "Jeff Mikolai")
2. Click on Strategy Call tab
3. See the Gmail search interface
4. Try quick search shortcuts
5. Click on a search result to view the full thread
6. See how all the context is displayed for validation

Currently using mock data, but the UI and flow are production-ready!
