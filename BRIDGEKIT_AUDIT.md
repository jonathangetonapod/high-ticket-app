# BridgeKit/MCP Audit Report

**Generated:** 2026-02-08  
**Scope:** high-ticket-app codebase  
**Search Patterns:** `bridgekit`, `mcporter`, `mcp__`

---

## Summary

| Category | Count |
|----------|-------|
| Total References | 5 |
| Comments/TODOs (removable) | 5 |
| Active Code (needs replacement) | 0 |

**Good news:** All BridgeKit references are commented out or documentation comments. No active code depends on BridgeKit MCP.

---

## Detailed Findings

### 1. `frontend/app/api/gmail/thread/route.ts`

| Line | Type | Content |
|------|------|---------|
| 16 | TODO Comment | `// TODO: Connect to BridgeKit MCP` |
| 17-19 | Commented Code | `// const result = await mcp__claude_ai_BridgeKit__get_email_thread({...})` |

**Status:** ⚠️ Comment/TODO - Can be removed  
**Current Implementation:** Uses mock data (lines 22-107)  
**Action Needed:** 
- Remove the TODO and commented MCP code
- Replace mock data with direct Gmail API calls (via existing lib or new implementation)

---

### 2. `frontend/app/api/gmail/search/route.ts`

| Line | Type | Content |
|------|------|---------|
| 17 | TODO Comment | `// TODO: Connect to BridgeKit MCP` |
| 18-21 | Commented Code | `// const result = await mcp__claude_ai_BridgeKit__search_emails({...})` |

**Status:** ⚠️ Comment/TODO - Can be removed  
**Current Implementation:** Uses mock data (lines 24-60)  
**Action Needed:**
- Remove the TODO and commented MCP code
- Replace mock data with direct Gmail API calls

---

### 3. `frontend/app/api/clients/route.ts`

| Line | Type | Content |
|------|------|---------|
| 8 | Documentation Comment | `// Fetch from real Google Sheet (same one used by BridgeKit MCP)` |

**Status:** ✅ Documentation only - Can be simplified  
**Current Implementation:** Already uses direct Google Sheets API via `@/lib/sheets`  
**Action Needed:**
- Update comment to remove BridgeKit reference (e.g., "Fetch from Google Sheets")

---

## Files with NO BridgeKit References (Verified Clean)

- `frontend/lib/instantly.ts` ✅
- `frontend/lib/bison.ts` ✅
- `frontend/lib/sheets.ts` ✅
- `frontend/lib/slack.ts` ✅
- `frontend/lib/fathom.ts` ✅
- `frontend/lib/users.ts` ✅
- `frontend/lib/utils.ts` ✅
- `frontend/lib/requirements.ts` ✅

---

## Build Artifact (Ignorable)

| File | Note |
|------|------|
| `frontend/.next/dev/server/chunks/[root-of-the-server]__7a4427ac._.js:294` | Build output mirroring clients/route.ts comment - will auto-update after source changes |

---

## Recommended Actions

### Immediate (Safe to do now)
1. **Remove commented BridgeKit code** from gmail routes (lines are already non-functional)
2. **Update documentation comment** in clients/route.ts to remove BridgeKit mention

### Requires Implementation
3. **Gmail Thread Route** - Replace mock data with:
   - Direct Gmail API integration (OAuth2 + googleapis)
   - Or a new internal lib/gmail.ts module

4. **Gmail Search Route** - Replace mock data with:
   - Direct Gmail API search (same as above)

### Notes
- The `lib/` files (instantly.ts, bison.ts, sheets.ts) already use direct API calls - this is the pattern to follow
- No MCP tool imports or dependencies exist in package.json
- All BridgeKit references are vestigial from an earlier design phase

---

## Conclusion

The codebase is **BridgeKit-free** in terms of functional code. All references are either:
1. Placeholder comments/TODOs for future work that never happened
2. Documentation comments referencing BridgeKit as context

Safe to clean up without breaking any functionality.
