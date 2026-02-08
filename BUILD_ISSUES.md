# Build Issues Report

**Generated:** 2026-02-08  
**Project:** high-ticket-app/frontend  

---

## ✅ Summary

| Check | Status | Issues |
|-------|--------|--------|
| `npm run build` | ⚠️ Warning | 1 deprecation warning |
| `npx tsc --noEmit` | ✅ Pass | No errors |
| Console.log statements | ✅ Clean | None found |
| ESLint | ❌ Not configured | Missing eslint.config.js |
| Hardcoded values | ⚠️ Found | 6+ instances |

---

## 1. Build Warnings

### ⚠️ Deprecated Config Export
**File:** `app/api/process-leads/route.ts:515`

```typescript
export const config = {
  api: {
    bodyParser: false, // Disable default body parsing for multipart
  },
}
```

**Issue:** Page config in `config` is deprecated in Next.js 16.x and ignored.

**Fix:** Migrate to route segment config:
```typescript
// Remove the config export entirely
// For multipart handling, use the Web API Request directly
// The App Router doesn't parse the body by default
```

---

## 2. TypeScript Errors

✅ **None** - `npx tsc --noEmit` passed with no errors.

---

## 3. Linting Issues

### ❌ ESLint Not Configured
ESLint 10.x requires `eslint.config.js` (flat config). No configuration file exists.

**Recommended:** Create `eslint.config.js`:
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

---

## 4. Hardcoded Values (Should Be Environment Variables)

### API Base URLs

| File | Line | Hardcoded Value |
|------|------|-----------------|
| `app/api/warmup-analytics/route.ts` | 3 | `https://api.instantly.ai/api/v2` |
| `app/api/mailbox-delete/route.ts` | 3 | `https://api.instantly.ai/api/v2` |
| `app/api/mailbox-delete/route.ts` | 4 | `https://send.leadgenjay.com/api` |
| `app/api/bison-warmup/route.ts` | 3 | `https://send.leadgenjay.com/api` |
| `app/api/mailbox-health/route.ts` | 3 | `https://api.instantly.ai/api/v2` |
| `app/api/mailbox-health/route.ts` | 4 | `https://send.leadgenjay.com/api` |

**Recommendation:** Add to `.env`:
```bash
INSTANTLY_API_BASE=https://api.instantly.ai/api/v2
BISON_API_BASE=https://send.leadgenjay.com/api
```

### Google Sheets URL/IDs

| File | Line | Issue |
|------|------|-------|
| `app/api/warmup-analytics/route.ts` | 6 | Hardcoded SHEET_URL with spreadsheet ID |
| `app/api/mailbox-delete/route.ts` | 7 | Hardcoded SHEET_URL with spreadsheet ID |
| `app/api/bison-warmup/route.ts` | 6 | Hardcoded SHEET_URL with spreadsheet ID |
| `app/api/mailbox-health/route.ts` | 7 | Hardcoded SHEET_URL with spreadsheet ID |

**Recommendation:** Add to `.env`:
```bash
CLIENTS_SHEET_ID=1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY
```

---

## 5. TODO/FIXME Comments

| File | Line | Comment |
|------|------|---------|
| `app/api/gmail/thread/route.ts` | 16 | `// TODO: Connect to BridgeKit MCP` |
| `app/api/gmail/search/route.ts` | 17 | `// TODO: Connect to BridgeKit MCP` |

These indicate incomplete integrations that should be addressed before production.

---

## 6. Recommended Cleanup Tasks

### High Priority
1. **Fix deprecated config export** in `app/api/process-leads/route.ts`
2. **Add ESLint configuration** for consistent code quality
3. **Extract hardcoded URLs to environment variables**

### Medium Priority
4. **Create shared constants file** for API URLs (e.g., `lib/constants.ts`)
5. **Complete TODO items** for BridgeKit MCP integration
6. **Add `.env` entries** to `.env.example` for new environment variables

### Low Priority
7. **Consider adding lint scripts** to `package.json`:
   ```json
   "lint": "eslint . --ext .ts,.tsx",
   "lint:fix": "eslint . --ext .ts,.tsx --fix"
   ```

---

## 7. Suggested .env Additions

Add these to `.env.example`:
```bash
# API Base URLs
INSTANTLY_API_BASE=https://api.instantly.ai/api/v2
BISON_API_BASE=https://send.leadgenjay.com/api

# Google Sheets
CLIENTS_SHEET_ID=your_spreadsheet_id_here
INSTANTLY_GID=your_gid_here
BISON_GID=your_gid_here
```

---

## Build Output

```
✓ Compiled successfully in 3.4s
✓ 25 static pages generated
✓ 20 dynamic API routes
```

The build completes successfully despite the warning, but the deprecation should be addressed for Next.js 17+ compatibility.
