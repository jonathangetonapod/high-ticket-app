# Lead Processing Pipeline Audit

**Generated:** 2026-02-08  
**Auditor:** Subagent (audit-lead-pipeline)  
**Status:** ⚠️ FUNCTIONAL WITH ISSUES

---

## End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER INTERFACE                                                              │
│  EmailCopyAndLeads.tsx                                                       │
│  ┌──────────────────┐                                                        │
│  │ CSV File Upload  │─────► handleLeadListUpload()                          │
│  └──────────────────┘           │                                            │
│                                 │                                            │
│  1. Local quick-parse (first 10 rows)                                       │
│     └─► setCampaignLeadLists() → immediate preview                          │
│                                 │                                            │
│  2. API call: POST /api/process-leads                                       │
│     FormData: { file, campaignId, clientId }                                │
└──────────────────────────────────│──────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  API LAYER                                                                   │
│  /app/api/process-leads/route.ts                                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ VALIDATION                                                       │        │
│  │ • File exists?                                                  │        │
│  │ • campaignId provided?                                          │        │
│  │ • .csv extension?                                               │        │
│  │ • Size ≤ 50MB?                                                  │        │
│  │ • Not empty?                                                    │        │
│  └───────────────────────────────────┬─────────────────────────────┘        │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ processCSVStream()                                               │        │
│  │ • Stream-parse with csv-parse                                   │        │
│  │ • Detect column mapping (first row headers)                     │        │
│  │ • For each row:                                                 │        │
│  │   - mapRecordToLead()                                           │        │
│  │   - Check missing email → missingRequired++                     │        │
│  │   - Deduplicate by email → duplicateEmails[]                   │        │
│  │   - validateSingleEmail() → FROM /lib/lead-validation.ts       │        │
│  │     ├─ disposableEmails++ (removed)                             │        │
│  │     ├─ invalidEmails++ (removed)                                │        │
│  │     └─ genericEmails++ (kept, flagged)                          │        │
│  │   - Count field coverage                                        │        │
│  │   - Track distributions (titles, industries, etc.)              │        │
│  │   - Collect sampleRows (first 10)                               │        │
│  │   - Add to validLeads[]                                         │        │
│  └───────────────────────────────────┬─────────────────────────────┘        │
│                                      ▼                                       │
│  RESPONSE: ProcessingResult                                                  │
│  { success, stats, fieldCoverage, distributions, issues, sampleRows, leads }│
└──────────────────────────────────────│──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DATA TRANSFORMATION                                                         │
│  EmailCopyAndLeads.tsx → transformApiResponse()                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ API Response                    │  LeadInsights Expected        │        │
│  │ ────────────────────────────────│──────────────────────────     │        │
│  │ issues.invalidEmails: number   →│  issues.invalidEmails: []    │ ⚠️     │
│  │ issues.disposableEmails: number →│  issues.disposableEmails: [] │ ⚠️     │
│  │ issues.genericEmails: number   →│  issues.genericEmails: []    │ ⚠️     │
│  │ issues.duplicateEmails: string[]→│  issues.duplicateEmails: []  │ ✓      │
│  │ distributions: Record<,number> →│  distributions: DistItem[]   │ ✓      │
│  │ fieldCoverage: object          →│  fieldCoverage: array        │ ✓      │
│  └─────────────────────────────────────────────────────────────────┘        │
└──────────────────────────────────────│──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DISPLAY                                                                     │
│  LeadInsights.tsx                                                            │
│                                                                              │
│  • Summary cards (total, valid, invalid, duplicates)                        │
│  • Field coverage horizontal bars                                            │
│  • Distribution tabs (titles, industries, sizes, domains)                   │
│  • Issue alert cards (collapsible, show emails)                             │
│  • Sample preview table                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Type Compatibility Issues

### 🔴 CRITICAL: Issue Detail Arrays Empty

**Location:** `EmailCopyAndLeads.tsx` lines 51-56

```typescript
// Current transformation:
issues: {
  invalidEmails: [],      // API returns COUNT (number), not list!
  disposableEmails: [],   // API returns COUNT (number), not list!
  genericEmails: [],      // API returns COUNT (number), not list!
  duplicateEmails: issues?.duplicateEmails || []  // Only this works
}
```

**Impact:** The `IssueAlertCard` component has collapsible sections to show individual emails, but they will ALWAYS be empty for invalid/disposable/generic emails because the API only returns counts.

**Root Cause:** The API (`route.ts`) increments counters but doesn't collect the actual email addresses:
```typescript
// API only tracks counts:
let invalidEmails = 0
let disposableEmails = 0
let genericEmails = 0

// But duplicates ARE tracked:
const duplicateEmails: string[] = []
```

**Fix Required:** Modify API to collect arrays (with reasonable limits):
```typescript
const invalidEmailList: string[] = []
const disposableEmailList: string[] = []
const genericEmailList: string[] = []

// In the processing loop:
if (!emailValidation.isValid) {
  if (emailValidation.isDisposable) {
    disposableEmails++
    if (disposableEmailList.length < 100) disposableEmailList.push(lead.email)
  } else {
    invalidEmails++
    if (invalidEmailList.length < 100) invalidEmailList.push(lead.email)
  }
}
```

### 🟡 MEDIUM: Lead Type Definitions Duplicated

Three separate `Lead` interface definitions exist:

| File | Location | Notes |
|------|----------|-------|
| `route.ts` | imports from `lead-validation.ts` | ✓ Correct |
| `lead-validation.ts` | lines 17-29 | Canonical definition |
| `validation.ts` | lines 4-14 | Duplicate definition |

**Impact:** Potential drift if types evolve differently.

**Fix:** Export `Lead` from one source, import everywhere.

### 🟡 MEDIUM: FieldCoverage Type Mismatch

**API returns:**
```typescript
fieldCoverage: {
  email: { count: number; percentage: number }
  firstName: { count: number; percentage: number }
  // ... object with named keys
}
```

**LeadInsights expects:**
```typescript
fieldCoverage: Array<{ field: string; count: number; percentage: number }>
```

**Status:** Handled by `transformApiResponse()` but creates runtime overhead.

---

## Performance Bottlenecks

### 🔴 CRITICAL: Full Lead Array in Response

**Location:** `route.ts` line 41

```typescript
interface ProcessingResult {
  // ...
  leads: Lead[]  // ⚠️ ALL valid leads returned!
}
```

**Impact for 10-20k rows:**
- Response payload: ~2-5MB for 20k leads
- Memory spike on both server and client
- Network transfer time
- JSON serialization overhead

**Observed Usage:** The `leads` array is NOT used by `EmailCopyAndLeads.tsx` - it only uses:
- `stats.*`
- `fieldCoverage`
- `distributions`
- `issues`
- `sampleRows`

**Fix:** Remove `leads` from response or add pagination:
```typescript
// Option A: Remove entirely
// leads: Lead[]  // DELETE THIS

// Option B: Add pagination
leads?: Lead[]
leadsPage?: number
leadsTotal?: number
```

### 🟡 MEDIUM: No Row Count Limit

The API limits file size (50MB) but not row count. A maliciously crafted CSV with minimal data per row could have millions of rows.

**Recommendation:** Add row limit:
```typescript
const MAX_ROWS = 50000

if (totalRows > MAX_ROWS) {
  throw new Error(`CSV exceeds maximum row limit (${MAX_ROWS}). Please split into smaller files.`)
}
```

### 🟡 MEDIUM: Distribution Maps Unbounded

Title/industry/company distributions grow unbounded with unique values:
```typescript
const titleCounts: Record<string, number> = {}  // Could have 20k unique entries
```

**Current Mitigation:** `getTopN()` trims to 10 in response, but memory used during processing.

### 🟢 LOW: Streaming Parse Then Memory Load

The parser streams records:
```typescript
const parser = Readable.from(buffer).pipe(parse({...}))
for await (const record of parser) { ... }
```

But results are accumulated in memory. True streaming would pipe validated leads to a database or file.

---

## Error Handling Gaps

### Edge Cases Coverage

| Scenario | Handled? | Location |
|----------|----------|----------|
| No file in FormData | ✓ | route.ts:274 |
| No campaignId | ✓ | route.ts:280 |
| Non-.csv extension | ✓ | route.ts:287 |
| File > 50MB | ✓ | route.ts:294 |
| Empty file (0 bytes) | ✓ | route.ts:303 |
| No email column | ✓ | route.ts:177 |
| Empty CSV (headers only) | ⚠️ Partial | Returns 0 rows, no error |
| Malformed rows | ✓ | csv-parse `skip_records_with_error` |
| UTF-8 BOM | ✓ | csv-parse `bom: true` |
| Network timeout | ❌ | No client-side timeout handling |
| All rows invalid | ⚠️ Partial | Returns success with validRows=0 |

### 🔴 Missing: Client-Side Error Recovery

**Location:** `EmailCopyAndLeads.tsx` lines 102-104

```typescript
} else {
  console.error('Failed to process leads:', await response.text())
}
```

**Issues:**
- No user notification on API failure
- No retry logic
- Processing state not cleared properly

**Fix:**
```typescript
} else {
  const errorText = await response.text()
  console.error('Failed to process leads:', errorText)
  alert(`Failed to process leads: ${errorText}`)  // Or use toast
  setCampaignInsights(prev => {
    const next = { ...prev }
    delete next[campaignId]  // Clear failed insight
    return next
  })
}
```

### 🟡 Missing: Parse Error Reporting

The API uses `skip_records_with_error: true` but doesn't report which rows failed or why. Users can't fix malformed data.

---

## Unused/Disconnected Code

### 🔴 lead-validation.ts Functions Not Used by API

The API imports only 3 items from `lead-validation.ts`:
```typescript
import { Lead, validateSingleEmail, extractDomain } from '@/lib/lead-validation'
```

**Unused functions (could be useful):**

| Function | Purpose | Should Use? |
|----------|---------|-------------|
| `parseLeadCSV()` | Client-side CSV parsing | No (API does this) |
| `parseLeadCSVString()` | String-based parsing | No |
| `validateEmails()` | Batch email validation | Maybe (returns structured results) |
| `detectCompetitors()` | Flag competitor domains | ✓ Add to pipeline |
| `matchICP()` | Score leads against ICP | ✓ Add to pipeline |
| `deduplicateLeads()` | Dedupe with details | No (API has own logic) |
| `deduplicateLeadsAdvanced()` | Fuzzy name+company dedupe | ✓ Consider adding |
| `generateLeadReport()` | Comprehensive stats | Maybe (API generates similar) |
| `validateLeadList()` | Full pipeline | ✓ Consider as unified processor |

### 🔴 validation.ts (AI) Completely Disconnected

`/lib/validation.ts` contains Claude-based validation:
- `validateCopy()` - Validates email copy against ICP
- `validateLeads()` - AI-based lead ICP matching
- `validateAlignment()` - Copy/leads alignment check
- `runFullValidation()` - Orchestrates all three

**Current Status:** NOT integrated with CSV processing pipeline.

**Integration Point:** The `onValidate` button in `EmailCopyAndLeads.tsx` should call these after CSV processing:
```typescript
// After CSV processing, run AI validation
const aiValidation = await runFullValidation(
  campaign.sequences,
  apiResponse.leads,  // Use processed leads
  icpDescription,
  strategistNotes
)
```

---

## Missing Features

### P0 (Critical)

1. **Return invalid email lists in API response** - For user to see which emails failed
2. **Remove `leads[]` from response** - Memory/bandwidth waste
3. **Client-side error handling** - Show failures to users

### P1 (High)

4. **Integrate AI validation (validation.ts)** - Connect to pipeline
5. **Row count limit** - Prevent abuse
6. **Progress indicator for large files** - UX improvement
7. **Competitor detection** - Use existing `detectCompetitors()`

### P2 (Medium)

8. **ICP matching integration** - Use `matchICP()` from lead-validation.ts
9. **Advanced deduplication option** - Name+company fuzzy matching
10. **Export cleaned leads** - Download validated CSV
11. **Parse error reporting** - Tell users which rows failed

### P3 (Low)

12. **Chunked upload** - For files >50MB
13. **Background processing** - Queue large files
14. **Caching** - Don't reprocess unchanged files

---

## Test Cases Needed

### Unit Tests

```typescript
// route.ts
describe('processCSVStream', () => {
  it('should detect column mappings for various header formats')
  it('should handle empty CSV gracefully')
  it('should respect 50MB file limit')
  it('should deduplicate emails case-insensitively')
  it('should flag disposable domains')
  it('should flag generic emails but keep valid')
  it('should handle UTF-8 BOM')
  it('should skip malformed rows without crashing')
  it('should count field coverage correctly')
  it('should limit distributions to top 10')
})

describe('validateSingleEmail', () => {
  it('should reject empty email')
  it('should reject invalid format')
  it('should detect disposable domains')
  it('should flag generic prefixes')
  it('should flag free email providers')
  it('should handle edge cases (numbers only, short local part)')
})
```

### Integration Tests

```typescript
describe('POST /api/process-leads', () => {
  it('should return 400 for missing file')
  it('should return 400 for missing campaignId')
  it('should return 400 for non-CSV file')
  it('should return 400 for empty file')
  it('should return 400 for CSV without email column')
  it('should process valid CSV and return stats')
  it('should handle 10k row CSV within 5 seconds')
  it('should not exceed 10MB response for 20k rows')
})
```

### E2E Tests

```typescript
describe('Lead Upload Flow', () => {
  it('should show loading state during upload')
  it('should display insights after processing')
  it('should show quality score correctly')
  it('should show distribution charts')
  it('should allow removing and re-uploading')
  it('should handle API errors gracefully')
  it('should enable validate button when all campaigns have leads')
})
```

### Load/Stress Tests

```typescript
describe('Performance', () => {
  it('should process 1k rows in <1s')
  it('should process 10k rows in <3s')
  it('should process 20k rows in <10s')
  it('should not exceed 500MB memory for 20k rows')
  it('should handle concurrent uploads')
})
```

---

## Recommended Action Items

### Immediate (This Sprint)

- [ ] Fix API to return email lists for issues (with 100-item cap)
- [ ] Remove `leads[]` from API response
- [ ] Add client-side error notification on API failure
- [ ] Add row count limit (50k)

### Short-term (Next Sprint)

- [ ] Integrate AI validation (`validation.ts`) into pipeline
- [ ] Add competitor detection using existing function
- [ ] Add progress indicator for large file processing
- [ ] Write unit tests for core functions

### Long-term (Backlog)

- [ ] ICP matching integration
- [ ] Advanced deduplication
- [ ] Export cleaned leads feature
- [ ] Background processing queue for large files

---

## Summary

The lead processing pipeline is **functional** but has significant opportunities for improvement:

| Category | Status |
|----------|--------|
| Core Processing | ✅ Works |
| Type Safety | ⚠️ Issues |
| Performance | ⚠️ Concerns at scale |
| Error Handling | ⚠️ Incomplete |
| Feature Integration | ❌ AI validation unused |
| Test Coverage | ❌ No tests found |

**Priority:** Fix the empty issue arrays and remove the leads array from response to prevent memory issues at scale.
