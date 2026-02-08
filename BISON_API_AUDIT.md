# Bison API Integration Audit

**Generated:** 2026-02-08  
**Scope:** `/frontend` directory  
**Status:** ✅ All Bison API calls are DIRECT (no MCP/BridgeKit)

---

## Summary

All Bison API integrations in the high-ticket-app frontend use **direct HTTP calls** to `https://send.leadgenjay.com/api`. There is NO dependency on BridgeKit MCP or any intermediary service for Bison functionality.

---

## Files with Bison API Calls

### 1. `lib/bison.ts` - Main Library
**Base URL:** `const BISON_API_BASE_URL = 'https://send.leadgenjay.com/api'`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sender-emails` | GET | List sender email accounts with campaign stats and creation dates |
| `/sender-emails?page={n}` | GET | Paginated sender accounts (15 per page) |
| `/warmup/sender-emails` | GET | List email accounts with warmup statistics |
| `/warmup/sender-emails?start_date=...&end_date=...&page={n}` | GET | Warmup data for date range |
| `/campaigns` | GET | List all campaigns |
| `/campaigns?page={n}` | GET | Paginated campaign list |
| `/campaigns/v1.1/{id}/sequence-steps` | GET | Get email sequence steps for a campaign |

**Exported Functions:**
- `listBisonCampaigns()` - List all campaigns for a client
- `getBisonCampaignDetails()` - Get campaign sequence steps
- `listBisonSenderEmails()` - Get sender emails with warmup health

---

### 2. `app/api/mailbox-health/route.ts` - Mailbox Health Dashboard
**Base URL:** `const BISON_API_BASE = 'https://send.leadgenjay.com/api'`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/warmup/sender-emails?start_date=...&end_date=...&warmup_status=enabled&page={n}` | GET | Warmup-enabled accounts |
| `/warmup/sender-emails?start_date=...&end_date=...&warmup_status=disabled&page={n}` | GET | Warmup-disabled accounts |

**Notes:**
- Fetches enabled and disabled accounts in parallel
- Uses `warmup_status` filter for accurate enabled/disabled status
- Returns `warmup_enabled` field from API

---

### 3. `app/api/bison-warmup/route.ts` - Detailed Warmup Stats
**Base URL:** `const BISON_API_BASE = 'https://send.leadgenjay.com/api'`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/warmup/sender-emails?start_date=...&end_date=...&page={n}` | GET | Warmup statistics |
| `/sender-emails?page={n}` | GET | Sender details (for `warmup_started_at`) |

**Notes:**
- Fetches warmup stats and sender details in parallel
- Merges data to get `warmup_started_at` timestamps
- Calculates warmup age, readiness status

---

### 4. `app/api/bison/sender-emails/route.ts` - Sender Emails API
**Uses:** `listBisonSenderEmails` from `@/lib/bison`

Simple wrapper that delegates to the main library function.

---

### 5. `app/api/mailbox-delete/route.ts` - Delete Mailboxes
**Base URL:** `const BISON_API_BASE = 'https://send.leadgenjay.com/api'`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sender-emails/{accountId}` | DELETE | Delete a sender email account |

---

## All Bison API Endpoints Used

| Endpoint | Method | Used In |
|----------|--------|---------|
| `/sender-emails` | GET | lib/bison.ts, bison-warmup/route.ts |
| `/sender-emails/{id}` | DELETE | mailbox-delete/route.ts |
| `/warmup/sender-emails` | GET | lib/bison.ts, mailbox-health/route.ts, bison-warmup/route.ts |
| `/campaigns` | GET | lib/bison.ts |
| `/campaigns/v1.1/{id}/sequence-steps` | GET | lib/bison.ts |

---

## Verification: Direct Calls Only ✅

All files use direct `fetch()` calls to `https://send.leadgenjay.com/api`:

```typescript
// Example from lib/bison.ts
const response = await fetch(url, {
  method,
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: body ? JSON.stringify(body) : undefined,
  cache: 'no-store',
})
```

**No MCP/BridgeKit usage found in any Bison-related code.**

---

## API Authentication

All Bison API calls use Bearer token authentication. API keys are fetched from a Google Sheet:
- **Sheet:** `1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY`
- **Tab GID:** `1631680229` (Bison Workspaces)
- **Format:** Column A = client_name, Column B = api_key

---

## Gaps / Missing Functionality

### Currently NOT Implemented (but available in Bison API):

1. **Lead Management**
   - `POST /leads` - Add leads to campaigns
   - `GET /leads` - Fetch lead responses
   - `PUT /leads/{id}` - Update lead status

2. **Campaign Management**
   - `POST /campaigns` - Create new campaigns
   - `PUT /campaigns/{id}` - Update campaign settings
   - `POST /campaigns/{id}/pause` - Pause campaigns
   - `POST /campaigns/{id}/resume` - Resume campaigns

3. **Warmup Controls**
   - `POST /warmup/enable` - Enable warmup for account
   - `POST /warmup/disable` - Disable warmup for account
   - `PUT /warmup/settings` - Update warmup settings

4. **Email Sending**
   - `POST /send` - Send emails directly
   - `GET /sent-emails` - Get sent email history

5. **Analytics**
   - `GET /analytics/campaigns` - Campaign performance metrics
   - `GET /analytics/emails` - Email delivery analytics

---

## Recommendations

### 1. Consolidate Base URLs
Currently the base URL is defined in 4 different files. Consider moving to a shared config:

```typescript
// lib/config.ts
export const BISON_API_BASE = 'https://send.leadgenjay.com/api'
```

### 2. Add Warmup Toggle Functionality
The UI shows warmup status but can't toggle it. Add:
```typescript
// lib/bison.ts
export async function toggleBisonWarmup(email: string, enabled: boolean) {
  // POST /warmup/enable or /warmup/disable
}
```

### 3. Add Lead Response Fetching
Currently leads/responses are only available via BridgeKit MCP. Consider direct integration:
```typescript
// lib/bison.ts
export async function getBisonLeads(clientName: string, days: number = 7) {
  // GET /leads?days=...
}
```

### 4. Consider Error Retry Logic
Current implementation has no retry logic for transient failures. Consider adding exponential backoff for robustness.

### 5. Add Request Caching Layer
The credential fetching has caching, but API responses don't. Consider caching warmup data for 1-2 minutes to reduce API load.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Routes                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/mailbox-health  │  /api/bison-warmup  │  /api/campaigns  │
│  /api/mailbox-delete  │  /api/bison/sender-emails              │
└───────────────────────┴─────────────────────┴───────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        lib/bison.ts                             │
│                   (Direct HTTP Client)                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Google Sheets (Credentials)                    │
│              spreadsheet ID: 1CNejGg-egkp28...                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Bison API (Direct)                           │
│              https://send.leadgenjay.com/api                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

The Bison integration is **clean, direct, and well-implemented**. All API calls go directly to the Bison API without any intermediary services. The codebase follows consistent patterns for authentication, pagination, and error handling.

The main opportunity for improvement is expanding functionality to cover more Bison API capabilities (leads, campaign management, warmup controls) rather than relying on BridgeKit MCP for those features.
