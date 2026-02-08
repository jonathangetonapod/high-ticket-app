# Instantly API Integration Audit

**Date:** 2026-02-08  
**Scope:** `/frontend` directory  
**Status:** ✅ All API calls are DIRECT (no MCP/BridgeKit)

---

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Instantly Endpoints Used | **6** |
| Direct API Calls | **6/6** (100%) |
| MCP/BridgeKit Calls | **0** |
| Available Endpoints Not Used | **3** |

---

## ✅ Instantly API Endpoints Currently Used

All endpoints use base URL: `https://api.instantly.ai/api/v2`

### 1. GET /accounts
**Used in:** 
- `app/api/mailbox-health/route.ts`
- `app/api/warmup-analytics/route.ts`

**Purpose:** List all email accounts with warmup status, scores, and settings

**Fields used:**
- `email`, `status`, `warmup_status`, `stat_warmup_score`
- `timestamp_warmup_start`, `timestamp_created`, `timestamp_last_used`
- `warmup` (limit, reply_rate, increment, warmup_custom_ftag)
- `warmup_pool_id`, `daily_limit`, `sending_gap`, `provider_code`

**Confirmation:** ✅ Direct call
```typescript
const response = await fetch(`${INSTANTLY_API_BASE}/accounts?limit=100`, {
  headers: { 'Authorization': `Bearer ${apiKey}` },
  ...
})
```

---

### 2. POST /accounts/warmup-analytics
**Used in:**
- `app/api/mailbox-health/route.ts` (via `fetchWarmupAnalytics`)
- `app/api/warmup-analytics/route.ts`

**Purpose:** Get detailed day-by-day warmup statistics for specific emails

**Request:** `{ emails: string[] }` (max 100)

**Response fields used:**
- `email_date_data` - Daily warmup activity
- `aggregate_data` - Totals (sent, landed_inbox, landed_spam, health_score)

**Confirmation:** ✅ Direct call
```typescript
const response = await fetch(`${INSTANTLY_API_BASE}/accounts/warmup-analytics`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ emails: emails.slice(0, 100) }),
  ...
})
```

---

### 3. GET /campaigns
**Used in:**
- `lib/instantly.ts` (via `listInstantlyCampaigns`)
- `app/api/campaigns/route.ts`

**Purpose:** List all campaigns with pagination

**Query params:** `starting_after`, `status`

**Confirmation:** ✅ Direct call
```typescript
const url = `${INSTANTLY_API_BASE_URL}/campaigns?${queryParams.toString()}`
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  ...
})
```

---

### 4. GET /campaigns/{campaign_id}
**Used in:**
- `lib/instantly.ts` (via `getInstantlyCampaignDetails`)
- `app/api/campaigns/details/route.ts`

**Purpose:** Get campaign details including email sequences

**Response fields used:**
- `name`, `sequences[0].steps[]`
- `variants[]` (subject, body)
- `delay`

**Confirmation:** ✅ Direct call
```typescript
const url = `${INSTANTLY_API_BASE_URL}/campaigns/${campaignId}`
```

---

### 5. DELETE /accounts/{email}
**Used in:**
- `app/api/mailbox-delete/route.ts`

**Purpose:** Delete an email account from workspace

**Confirmation:** ✅ Direct call
```typescript
const response = await fetch(`${INSTANTLY_API_BASE}/accounts/${encodeURIComponent(email)}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
})
```

---

## ❌ Available Endpoints NOT Currently Used

Based on the API reference at `/memory/instantly-mailbox-warmup-api.md`:

### 1. GET /accounts/analytics/daily
**Purpose:** Get daily CAMPAIGN sending stats (not warmup)

**Use case:** Track actual campaign email volume per account over time

**Example:**
```bash
curl "https://api.instantly.ai/api/v2/accounts/analytics/daily?\
start_date=2024-01-01&end_date=2024-01-31&emails=user@example.com"
```

**Recommendation:** 🟡 Consider adding for delivery reporting

---

### 2. GET /accounts/{email}
**Purpose:** Get detailed info for a single account

**Use case:** Quick lookup of one account without fetching all

**Recommendation:** 🟢 Low priority - bulk fetch already implemented

---

### 3. POST /accounts/test/vitals
**Purpose:** Test if accounts can send/receive emails

**Use case:** Pre-delivery health check, troubleshooting

**Example:**
```bash
curl -X POST https://api.instantly.ai/api/v2/accounts/test/vitals \
  -H "Content-Type: application/json" \
  -d '{"accounts": ["user@example.com"]}'
```

**Response:**
```json
{
  "success_list": [{ "email": "...", "send": true, "receive": true }],
  "failure_list": [{ "email": "...", "error": "Connection failed" }]
}
```

**Recommendation:** 🔴 HIGH PRIORITY - Add to delivery checklist!

---

## 🔧 Recommendations

### High Priority

1. **Add POST /accounts/test/vitals integration**
   - Create `/app/api/mailbox-vitals/route.ts`
   - Use in delivery checklist to verify accounts can actually send/receive
   - Prevents failed deliveries due to disconnected accounts

2. **Deduplicate API key fetching**
   - Both `mailbox-health/route.ts` and `warmup-analytics/route.ts` have duplicate `getApiKey` functions
   - Refactor to shared utility in `lib/instantly.ts`

### Medium Priority

3. **Add GET /accounts/analytics/daily**
   - Track campaign sending volume per account
   - Useful for identifying accounts hitting limits

4. **Consolidate warmup analytics**
   - `fetchWarmupAnalytics` exists in both routes
   - Move to `lib/instantly.ts` for reuse

### Low Priority

5. **Add single account lookup**
   - GET /accounts/{email} for quick lookups
   - Less important since bulk fetch works well

---

## 📁 Files Audited

| File | Instantly Endpoints | Status |
|------|---------------------|--------|
| `app/api/mailbox-health/route.ts` | GET /accounts, POST /accounts/warmup-analytics | ✅ Direct |
| `app/api/warmup-analytics/route.ts` | GET /accounts, POST /accounts/warmup-analytics | ✅ Direct |
| `app/api/campaigns/route.ts` | Uses lib/instantly.ts | ✅ Direct |
| `app/api/campaigns/details/route.ts` | Uses lib/instantly.ts | ✅ Direct |
| `app/api/mailbox-delete/route.ts` | DELETE /accounts/{email} | ✅ Direct |
| `lib/instantly.ts` | GET /campaigns, GET /campaigns/{id} | ✅ Direct |

---

## 🔐 Authentication Pattern

All files use Bearer token authentication:
```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
}
```

API keys are fetched from Google Sheets (workspace credential store):
- Sheet ID: `1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY`
- Instantly GID: `928115249`
- Columns: workspace_id, api_key, workspace_name, client_name

---

## ✅ Conclusion

**All Instantly API calls are DIRECT to `https://api.instantly.ai/api/v2`** - there is no MCP/BridgeKit intermediary layer in the frontend codebase.

The integration is well-structured with:
- Proper Bearer token auth
- Request timeouts and error handling
- Response caching (60s for health data, 5m for credentials)
- In-flight request deduplication

**Main gap:** Missing `/accounts/test/vitals` endpoint which would be valuable for pre-delivery verification.
