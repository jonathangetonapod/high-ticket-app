# API Routes Status Report

**Generated:** 2026-02-08  
**Total Endpoints:** 24 routes across 16 directories

---

## Summary Table

| Endpoint | Methods | Status | External APIs | Auth |
|----------|---------|--------|---------------|------|
| `/api/auth/login` | POST | ✅ Production | None | Public |
| `/api/auth/logout` | POST | ✅ Production | None | Public |
| `/api/auth/me` | GET | ✅ Production | None | Session |
| `/api/bison/sender-emails` | GET | ✅ Production | Bison | None |
| `/api/bison-warmup` | POST | ✅ Production | Bison, Google Sheets | None |
| `/api/campaigns` | GET | ✅ Production | Instantly, Bison | None |
| `/api/campaigns/details` | GET | ✅ Production | Instantly, Bison | None |
| `/api/clients` | GET | ✅ Production | Google Sheets | None |
| `/api/fathom/action-items` | GET | ✅ Production | Fathom | None |
| `/api/fathom/summary` | GET | ✅ Production | Fathom | None |
| `/api/fathom/transcript` | GET | ✅ Production | Fathom | None |
| `/api/gmail/search` | GET | ⚠️ Mock Data | None (TODO: BridgeKit) | None |
| `/api/gmail/thread` | GET | ⚠️ Mock Data | None (TODO: BridgeKit) | None |
| `/api/mailbox-delete` | POST | ✅ Production | Instantly, Bison, Google Sheets | None |
| `/api/mailbox-health` | GET | ✅ Production | Instantly, Bison, Google Sheets | None |
| `/api/process-leads` | POST | ✅ Production | None (CSV processing) | None |
| `/api/requirements` | GET, POST | ✅ Production | None (filesystem) | Admin (POST) |
| `/api/requirements/[slug]` | GET, PUT, DELETE | ✅ Production | None (filesystem) | Admin (PUT/DELETE) |
| `/api/slack/channels` | GET | ✅ Production | Slack | None |
| `/api/slack/history` | GET | ✅ Production | Slack | None |
| `/api/users` | GET, POST | ✅ Production | None (in-memory/file) | Admin |
| `/api/users/[id]` | DELETE, POST | ✅ Production | None (in-memory/file) | Admin |
| `/api/validate-campaign` | GET, POST | ✅ Production | Anthropic (Claude) | None |
| `/api/warmup-analytics` | POST | ✅ Production | Instantly, Google Sheets | None |

---

## Production Ready Endpoints (20)

### Authentication Routes

#### `POST /api/auth/login`
- **Purpose:** User authentication
- **Request:** `{ email: string, password: string }`
- **Response:** `{ success: boolean, user: { id, email, name, role } }`
- **External APIs:** None
- **Security:** Sets httpOnly session cookie (base64 encoded, 7-day expiry)
- **Notes:** Session is base64-encoded JSON - consider JWT for production

#### `POST /api/auth/logout`
- **Purpose:** User logout
- **Request:** None
- **Response:** `{ success: boolean }`
- **Security:** Clears session cookie

#### `GET /api/auth/me`
- **Purpose:** Get current user from session
- **Response:** `{ success: boolean, user: { id, email, name, role } }`
- **Security:** Requires valid session cookie

---

### Campaign Management

#### `GET /api/campaigns`
- **Purpose:** List campaigns for a client
- **Query Params:** `clientName`, `platform` (instantly|bison)
- **Response:** `{ success: boolean, campaigns: Campaign[] }`
- **External APIs:** Instantly API, Bison API
- **Lib Dependencies:** `@/lib/instantly`, `@/lib/bison`

#### `GET /api/campaigns/details`
- **Purpose:** Get detailed campaign info including email sequences
- **Query Params:** `clientName`, `campaignId`, `platform`, `campaignName?`
- **Response:** `{ success: boolean, campaign_id, campaign_name, platform, sequences }`
- **External APIs:** Instantly API, Bison API

---

### Mailbox Health & Management

#### `GET /api/mailbox-health`
- **Purpose:** Aggregate mailbox health across all clients
- **Query Params:** `refresh=true` (force cache refresh)
- **Response:** `{ success, summary, mailboxes: MailboxHealth[] }`
- **External APIs:** Instantly API (accounts, warmup-analytics), Bison API, Google Sheets
- **Caching:** 60-second in-memory cache, request deduplication
- **Notes:** Comprehensive health scoring with warmup status detection

#### `POST /api/mailbox-delete`
- **Purpose:** Delete a mailbox from Instantly or Bison
- **Request:** `{ platform, clientName, email, bisonId? }`
- **Response:** `{ success: boolean, message, platform, email }`
- **External APIs:** Instantly API, Bison API, Google Sheets (for API keys)
- **⚠️ Destructive:** Deletes mailbox permanently

#### `POST /api/warmup-analytics`
- **Purpose:** Get detailed warmup analytics for specific emails
- **Request:** `{ clientName: string, emails: string[] }`
- **Response:** `{ success, clientName, platform, summary, analytics }`
- **External APIs:** Instantly API (warmup-analytics, accounts)
- **Limit:** 100 emails per request

#### `POST /api/bison-warmup`
- **Purpose:** Get Bison warmup stats for a client
- **Request:** `{ clientName: string }`
- **Response:** `{ success, clientName, platform, summary, accounts }`
- **External APIs:** Bison API (warmup/sender-emails, sender-emails)

#### `GET /api/bison/sender-emails`
- **Purpose:** List Bison sender emails for a client
- **Query Params:** `clientName`, `startDate?`, `endDate?`
- **Response:** Via `@/lib/bison`
- **External APIs:** Bison API

---

### Client Management

#### `GET /api/clients`
- **Purpose:** List all clients from Google Sheets
- **Response:** `{ success, clients, total, instantly_count, bison_count }`
- **External APIs:** Google Sheets
- **Lib Dependencies:** `@/lib/sheets`
- **Config:** `dynamic: 'force-dynamic'`, `revalidate: 0`

---

### Lead Processing

#### `POST /api/process-leads`
- **Purpose:** Process and validate CSV lead files
- **Request:** multipart/form-data with `file` (CSV) and `campaignId`
- **Response:** `{ success, campaignId, stats, fieldCoverage, distributions, issues, sampleRows, leads }`
- **External APIs:** None (pure CSV processing)
- **Validation:** Email validation, deduplication, field detection
- **Limit:** 50MB max file size

#### `POST /api/validate-campaign`
- **Purpose:** AI-powered campaign validation
- **Request:** `{ campaignId, platform, emailSequence, leadList, icpDescription, strategistNotes? }`
- **Response:** `{ success, campaignId, platform, timestamp, ...validationResults }`
- **External APIs:** Anthropic (Claude) API
- **Lib Dependencies:** `@/lib/validation`

#### `GET /api/validate-campaign`
- **Purpose:** Health check / documentation
- **Response:** `{ status, endpoint, methods, requiredFields, optionalFields, configured }`

---

### Fathom Integration

#### `GET /api/fathom/transcript`
- **Purpose:** Get meeting transcript
- **Query Params:** `recordingId` (integer)
- **Response:** Via `@/lib/fathom`
- **External APIs:** Fathom API

#### `GET /api/fathom/summary`
- **Purpose:** Get meeting summary
- **Query Params:** `recordingId` (integer)
- **Response:** Via `@/lib/fathom`
- **External APIs:** Fathom API

#### `GET /api/fathom/action-items`
- **Purpose:** Get meeting action items
- **Query Params:** `recordingId` (integer)
- **Response:** Via `@/lib/fathom`
- **External APIs:** Fathom API

---

### Slack Integration

#### `GET /api/slack/channels`
- **Purpose:** List Slack channels
- **Query Params:** `types?`, `excludeArchived?`, `limit?`
- **Response:** Via `@/lib/slack`
- **External APIs:** Slack API

#### `GET /api/slack/history`
- **Purpose:** Get channel message history
- **Query Params:** `channel` (required), `limit?`, `includeThreads?`
- **Response:** Via `@/lib/slack`
- **External APIs:** Slack API

---

### User Management

#### `GET /api/users`
- **Purpose:** List all users
- **Response:** `{ success, users: SafeUser[] }`
- **Security:** Admin only
- **Notes:** Passwords excluded from response

#### `POST /api/users`
- **Purpose:** Create new user
- **Request:** `{ email, name, role }` (password auto-generated)
- **Response:** `{ success, user, temporaryPassword }`
- **Security:** Admin only

#### `DELETE /api/users/[id]`
- **Purpose:** Delete user
- **Response:** `{ success: boolean }`
- **Security:** Admin only

#### `POST /api/users/[id]`
- **Purpose:** Reset user password
- **Response:** `{ success, newPassword }`
- **Security:** Admin only

---

### Requirements (Documentation)

#### `GET /api/requirements`
- **Purpose:** List all requirement files
- **Response:** `{ success, requirements }`
- **Storage:** Filesystem

#### `POST /api/requirements`
- **Purpose:** Create new requirement
- **Request:** `{ slug, content }`
- **Security:** Admin only

#### `GET /api/requirements/[slug]`
- **Purpose:** Get single requirement
- **Response:** `{ success, requirement }`

#### `PUT /api/requirements/[slug]`
- **Purpose:** Update requirement
- **Request:** `{ content }`
- **Security:** Admin only

#### `DELETE /api/requirements/[slug]`
- **Purpose:** Delete requirement
- **Security:** Admin only

---

## Needs Work (2)

### Gmail Routes - Mock Data

#### `GET /api/gmail/search`
- **Status:** ⚠️ Returns mock data
- **TODO:** Connect to BridgeKit MCP
- **Query Params:** `query`, `maxResults?`, `account?`
- **Mock Response:** Hardcoded search results

#### `GET /api/gmail/thread`
- **Status:** ⚠️ Returns mock data
- **TODO:** Connect to BridgeKit MCP
- **Query Params:** `threadId`, `account?`
- **Mock Response:** Hardcoded email thread

---

## Security Analysis

### Authentication Issues

| Issue | Severity | Affected Routes | Recommendation |
|-------|----------|-----------------|----------------|
| No auth on API routes | 🔴 High | Most data routes | Add session validation middleware |
| Base64 session encoding | 🟡 Medium | Auth routes | Use JWT with signature verification |
| No CSRF protection | 🟡 Medium | All POST routes | Add CSRF tokens |
| No rate limiting | 🟡 Medium | All routes | Add rate limiting middleware |

### Routes Missing Authentication

These routes access sensitive data but have no authentication:
- `/api/clients` - Lists all clients
- `/api/campaigns` - Lists all campaigns
- `/api/mailbox-health` - All mailbox health data
- `/api/warmup-analytics` - Warmup data
- `/api/bison-warmup` - Bison data
- `/api/mailbox-delete` - **Destructive operation!**
- `/api/slack/*` - Slack access
- `/api/fathom/*` - Meeting data
- `/api/validate-campaign` - Campaign validation
- `/api/process-leads` - Lead processing

### Routes With Proper Auth
- `/api/users/*` - Admin only ✅
- `/api/requirements` (POST) - Admin only ✅
- `/api/requirements/[slug]` (PUT/DELETE) - Admin only ✅

---

## Error Handling Analysis

| Route | Input Validation | Error Messages | HTTP Codes |
|-------|------------------|----------------|------------|
| `/api/auth/*` | ✅ Good | ✅ Good | ✅ Correct |
| `/api/campaigns/*` | ✅ Good | ✅ Good | ✅ Correct |
| `/api/mailbox-*` | ✅ Good | ✅ Good | ✅ Correct |
| `/api/process-leads` | ✅ Excellent | ✅ Detailed | ✅ Correct |
| `/api/validate-campaign` | ✅ Excellent | ✅ Detailed | ✅ Correct |
| `/api/gmail/*` | ✅ Good | ⚠️ Generic | ✅ Correct |
| `/api/slack/*` | ✅ Good | ⚠️ Generic | ✅ Correct |
| `/api/fathom/*` | ✅ Good | ⚠️ Generic | ✅ Correct |

---

## Rate Limiting Recommendations

| Route | Risk Level | Recommendation |
|-------|------------|----------------|
| `/api/auth/login` | 🔴 High | 5 requests/min per IP |
| `/api/validate-campaign` | 🔴 High | 10 requests/min (Claude API costs) |
| `/api/mailbox-health` | 🟡 Medium | 1 request/min (cached anyway) |
| `/api/warmup-analytics` | 🟡 Medium | 10 requests/min |
| `/api/process-leads` | 🟡 Medium | 5 requests/min |
| `/api/mailbox-delete` | 🔴 High | 10 requests/hour |

---

## External API Dependencies

### Google Sheets (CSV Export)
- **Used by:** `clients`, `warmup-analytics`, `bison-warmup`, `mailbox-health`, `mailbox-delete`
- **Sheet ID:** `1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY`
- **GIDs:** Instantly: `928115249`, Bison: `1631680229`

### Instantly API
- **Base URL:** `https://api.instantly.ai/api/v2`
- **Used by:** `campaigns`, `mailbox-health`, `warmup-analytics`, `mailbox-delete`
- **Endpoints called:** `/accounts`, `/accounts/warmup-analytics`, `/campaigns`

### Bison API
- **Base URL:** `https://send.leadgenjay.com/api`
- **Used by:** `campaigns`, `mailbox-health`, `bison-warmup`, `mailbox-delete`, `bison/sender-emails`
- **Endpoints called:** `/warmup/sender-emails`, `/sender-emails`, `/campaigns`

### Anthropic API
- **Used by:** `validate-campaign`
- **Env var:** `ANTHROPIC_API_KEY`

### Fathom API
- **Used by:** `fathom/*` routes
- **Lib:** `@/lib/fathom`

### Slack API
- **Used by:** `slack/*` routes
- **Lib:** `@/lib/slack`

### BridgeKit MCP (TODO)
- **Will be used by:** `gmail/*` routes
- **Status:** Not yet connected

---

## Recommendations

### Immediate (Security)
1. **Add authentication middleware** to all data routes
2. **Add rate limiting** especially to `/auth/login` and `/validate-campaign`
3. **Replace base64 session** with signed JWT tokens
4. **Add CSRF tokens** for all mutating operations

### Short-term (Functionality)
1. **Connect Gmail routes** to BridgeKit MCP (remove mock data)
2. **Add request logging** for audit trail
3. **Add timeout handling** for external API calls (partially done in mailbox-health)

### Medium-term (Architecture)
1. **Create shared middleware** for auth, rate limiting, logging
2. **Add OpenAPI/Swagger documentation**
3. **Add integration tests** for each endpoint
4. **Consider moving to tRPC** for type-safe API calls

---

## File Structure

```
frontend/app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── me/route.ts
├── bison/
│   └── sender-emails/route.ts
├── bison-warmup/route.ts
├── campaigns/
│   ├── route.ts
│   └── details/route.ts
├── clients/route.ts
├── fathom/
│   ├── action-items/route.ts
│   ├── summary/route.ts
│   └── transcript/route.ts
├── gmail/
│   ├── search/route.ts         # ⚠️ Mock
│   └── thread/route.ts         # ⚠️ Mock
├── mailbox-delete/route.ts
├── mailbox-health/route.ts
├── process-leads/route.ts
├── requirements/
│   ├── route.ts
│   └── [slug]/route.ts
├── slack/
│   ├── channels/route.ts
│   └── history/route.ts
├── users/
│   ├── route.ts
│   └── [id]/route.ts
├── validate-campaign/route.ts
└── warmup-analytics/route.ts
```
