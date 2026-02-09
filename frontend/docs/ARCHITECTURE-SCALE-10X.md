# Delivery Checklist: 10x Scale Technical Architecture

**Author:** AI Senior Full-Stack Engineer  
**Date:** February 8, 2025  
**Status:** Technical Proposal  

---

## Executive Summary

The Delivery Checklist is a Next.js 16 application that validates email campaigns by checking lead lists, email copy quality, and ICP alignment using Claude AI. This document analyzes the current architecture and proposes changes to support 10x scale (100→1000 concurrent users, 5k→50k lead CSVs).

---

## 1. Current Architecture Analysis

### 1.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS v4           │
│  Components: Radix UI primitives + custom delivery-checklist/   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES                                  │
│  /api/validate-campaign    → Claude AI validation               │
│  /api/process-leads        → CSV parsing & validation           │
│  /api/clients              → Client data (BridgeKit MCP)        │
│  /api/campaigns/*          → Campaign management                 │
│  /api/mailbox-*            → Email infrastructure                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│  JSON files in /data/       (best-practices.json, client-context)│
│  External APIs: Instantly, Bison (via BridgeKit MCP)             │
│  AI: Anthropic Claude Sonnet                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Architecture

```
page.tsx (DeliveryChecklistPage)
├── State: useState for ALL state (17+ useState calls)
├── Effects: useEffect for data loading
├── Components:
│   ├── ClientCampaignSelector    (client/campaign selection + context)
│   ├── MailboxHealthCheck        (infrastructure validation)
│   ├── EmailCopyAndLeads         (1566 lines - MASSIVE component)
│   │   ├── LeadInsights          (CSV analysis display)
│   │   └── EmailQualityAnalysis  (spam detection)
│   └── ReviewSubmit              (final validation)
└── Tab Navigation: Radix Tabs
```

### 1.3 Data Flow Patterns

**Current Pattern: Prop Drilling + Callbacks**

```
┌──────────────────┐
│   page.tsx       │ ← All state lives here
└────────┬─────────┘
         │ props (formData, validations, handlers)
         ▼
┌──────────────────┐
│ ClientCampaign   │ → calls onFormDataChange, onClientSelect
│   Selector       │ → receives clients, campaigns, formData
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ EmailCopyAndLeads│ → receives selectedCampaigns, validation
│ (1566 lines!)    │ → calls onValidate, onLeadDataChange
└──────────────────┘
```

### 1.4 Current Strengths ✅

1. **Strong typing** - Comprehensive TypeScript interfaces in `types.ts`
2. **Clean validation logic** - Well-separated in `/lib/lead-validation.ts` and `/lib/email-analysis.ts`
3. **Modular component structure** - Each tab is its own component
4. **Good error handling** - API routes have proper error responses
5. **Local-first CSV processing** - Streaming parser handles large files

### 1.5 Current Weaknesses ❌

1. **Monolithic component** - `EmailCopyAndLeads.tsx` at 1566 lines is unmaintainable
2. **All state in page.tsx** - No state management, prop drilling nightmare
3. **No caching** - Every request hits external APIs
4. **Synchronous AI calls** - UI blocks during Claude validation
5. **No persistence** - Progress lost on refresh
6. **JSON file "database"** - Not scalable, no ACID guarantees
7. **No tests** - Zero test coverage observed
8. **No rate limiting** - API routes unprotected

---

## 2. Scalability Concerns

### 2.1 Breaking Points by User Count

| Scale | Concern | Impact | Severity |
|-------|---------|--------|----------|
| **100 users** | Claude API rate limits | Validation failures | 🔴 Critical |
| **100 users** | No request queuing | Race conditions on JSON files | 🔴 Critical |
| **500 users** | Memory pressure | CSV processing in-memory | 🟡 High |
| **500 users** | BridgeKit MCP saturation | Client/campaign fetches slow | 🟡 High |
| **1000 users** | Next.js serverless cold starts | Inconsistent response times | 🟡 High |
| **1000 users** | No horizontal scaling | Single instance bottleneck | 🔴 Critical |

### 2.2 Breaking Points by CSV Size

| Size | Current Behavior | Issue |
|------|------------------|-------|
| **5k leads** | Works fine | ~2-3 seconds processing |
| **10k leads** | Starts lagging | 5-8 seconds, UI feels slow |
| **25k leads** | Risky | Memory pressure, may timeout |
| **50k leads** | Will fail | Request timeout (30s default), OOM possible |

### 2.3 Bottleneck Analysis

```
                     BOTTLENECKS
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│ AI API     │    │ CSV Parse  │    │ State      │
│ (Claude)   │    │ (Memory)   │    │ (page.tsx) │
├────────────┤    ├────────────┤    ├────────────┤
│ - Rate     │    │ - Buffer   │    │ - 17+      │
│   limits   │    │   full CSV │    │   useState │
│ - No queue │    │ - Sync     │    │ - Prop     │
│ - Blocking │    │   parsing  │    │   drilling │
│ - $$$      │    │ - No chunk │    │ - Re-render│
└────────────┘    └────────────┘    └────────────┘
```

---

## 3. Performance Optimization

### 3.1 Critical Path Optimization

**Current Validate Flow (Blocking):**
```
User clicks "Validate"
    → Build payload (10ms)
    → API call to /api/validate-campaign
        → Load best-practices.json (5ms)
        → Load client-context (5ms)  
        → Call Claude API (3-15 SECONDS) ← BLOCKING
        → Parse response (10ms)
    → Update UI
Total: 3-15 seconds with frozen UI
```

**Proposed Flow (Non-blocking with Streaming):**
```
User clicks "Validate"
    → Show optimistic UI ("Validating...")
    → API call with streaming response
        → Cache best-practices (in-memory)
        → Cache client-context (Redis)
        → Stream Claude response via SSE
        → UI updates progressively
    → Show final result
User can continue working during validation
```

### 3.2 Specific Optimizations

#### A. CSV Processing - Chunk-based Streaming

**Before (current):**
```typescript
// process-leads/route.ts - loads entire file into memory
const arrayBuffer = await file.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)  // ← Full file in memory
```

**After (proposed):**
```typescript
// Use TransformStream for chunk processing
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  // Stream processing with backpressure
  const stream = file.stream()
  const reader = stream.getReader()
  
  let stats = { total: 0, valid: 0, invalid: 0 }
  let buffer = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += new TextDecoder().decode(value)
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line
    
    for (const line of lines) {
      stats.total++
      // Process each line individually
      const lead = parseLine(line, headers)
      if (validateLead(lead)) stats.valid++
      else stats.invalid++
    }
    
    // Yield to event loop every 1000 lines
    if (stats.total % 1000 === 0) {
      await new Promise(r => setTimeout(r, 0))
    }
  }
  
  return NextResponse.json({ success: true, stats })
}
```

#### B. AI Validation - Queue + Streaming

```typescript
// New file: /lib/ai-queue.ts
import { Anthropic } from '@anthropic-ai/sdk'

interface QueuedValidation {
  id: string
  payload: ValidateCampaignRequest
  resolve: (result: ValidationResponse) => void
  reject: (error: Error) => void
  retries: number
}

class AIValidationQueue {
  private queue: QueuedValidation[] = []
  private processing = false
  private client: Anthropic
  private concurrency = 3 // Process 3 at a time
  private activeCount = 0
  
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  
  async enqueue(payload: ValidateCampaignRequest): Promise<ValidationResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: crypto.randomUUID(),
        payload,
        resolve,
        reject,
        retries: 0
      })
      this.process()
    })
  }
  
  private async process() {
    if (this.processing || this.activeCount >= this.concurrency) return
    this.processing = true
    
    while (this.queue.length > 0 && this.activeCount < this.concurrency) {
      const item = this.queue.shift()!
      this.activeCount++
      
      this.validateWithRetry(item)
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.activeCount--
          this.process()
        })
    }
    
    this.processing = false
  }
  
  private async validateWithRetry(item: QueuedValidation, maxRetries = 3) {
    try {
      return await this.callClaude(item.payload)
    } catch (error) {
      if (item.retries < maxRetries && this.isRetryable(error)) {
        item.retries++
        await this.delay(Math.pow(2, item.retries) * 1000) // Exponential backoff
        return this.validateWithRetry(item, maxRetries)
      }
      throw error
    }
  }
}

export const aiQueue = new AIValidationQueue()
```

#### C. Response Caching with SWR Pattern

```typescript
// Add to ClientCampaignSelector.tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ClientCampaignSelector({ ... }) {
  // Replace useState + useEffect with SWR
  const { data: clients, isLoading: loadingClients } = useSWR(
    '/api/clients',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 60s
    }
  )
  
  const { data: campaigns, isLoading: loadingCampaigns } = useSWR(
    formData.clientName ? `/api/campaigns?clientName=${formData.clientName}&platform=${formData.platform}` : null,
    fetcher,
    { dedupingInterval: 30000 }
  )
  
  // ...
}
```

### 3.3 Performance Metrics Targets

| Metric | Current | Target (10x) |
|--------|---------|--------------|
| Initial page load | ~800ms | <400ms |
| Client list fetch | ~500ms | <100ms (cached) |
| CSV upload 5k | ~3s | <1s |
| CSV upload 50k | Fails | <10s |
| AI validation | 3-15s blocking | 3-15s non-blocking |
| Memory per request | ~100MB | <20MB |

---

## 4. State Management

### 4.1 Current Problem

The page component has **17+ useState calls**:

```typescript
// page.tsx - excerpt
const [activeTab, setActiveTab] = useState('client-campaign')
const [clients, setClients] = useState<Client[]>([])
const [campaigns, setCampaigns] = useState<Campaign[]>([])
const [loadingClients, setLoadingClients] = useState(true)
const [loadingCampaigns, setLoadingCampaigns] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
const [selectedCampaignsDetails, setSelectedCampaignsDetails] = useState<CampaignDetails[]>([])
const [loadingCampaignDetails, setLoadingCampaignDetails] = useState(false)
const [campaignLeadLists, setCampaignLeadLists] = useState<CampaignLeadListData>({})
const [formData, setFormData] = useState({ ... })  // Nested object
const [validations, setValidations] = useState({ ... })  // Nested object
// ... more
```

**Problems:**
1. Every state change re-renders entire page + all children
2. Props must be passed 2-3 levels deep
3. No persistence - refresh = lost progress
4. No undo/redo capability
5. Hard to debug - state scattered

### 4.2 Recommended: Zustand + Persist

**Why Zustand over Redux?**
- Simpler API, less boilerplate
- Built-in TypeScript support
- ~2KB vs Redux's ~30KB
- Built-in persist middleware
- No provider needed

```typescript
// New file: /store/delivery-checklist.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface DeliveryChecklistState {
  // UI State
  activeTab: string
  
  // Data
  clients: Client[]
  campaigns: Campaign[]
  selectedCampaignIds: string[]
  selectedCampaignsDetails: CampaignDetails[]
  campaignLeadLists: CampaignLeadListData
  
  // Form
  formData: FormData
  validations: Record<string, ValidationResult>
  
  // Loading States (grouped)
  loading: {
    clients: boolean
    campaigns: boolean
    campaignDetails: boolean
    submitting: boolean
  }
  
  // Actions
  selectClient: (clientId: string) => void
  toggleCampaign: (campaignId: string) => void
  setFormField: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  setValidation: (step: string, result: ValidationResult) => void
  uploadLeadList: (campaignId: string, data: LeadListData) => void
  reset: () => void
}

const initialState = {
  activeTab: 'client-campaign',
  clients: [],
  campaigns: [],
  selectedCampaignIds: [],
  selectedCampaignsDetails: [],
  campaignLeadLists: {},
  formData: { /* ... */ },
  validations: {},
  loading: {
    clients: true,
    campaigns: false,
    campaignDetails: false,
    submitting: false,
  },
}

export const useDeliveryChecklist = create<DeliveryChecklistState>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      
      selectClient: (clientId) => {
        const client = get().clients.find(c => c.id === clientId)
        if (!client) return
        
        set(state => {
          state.formData.clientId = clientId
          state.formData.clientName = client.name
          state.formData.platform = client.platform
          state.formData.workspaceId = client.workspaceId
          // Reset campaign selections
          state.selectedCampaignIds = []
          state.selectedCampaignsDetails = []
          state.campaigns = []
        })
      },
      
      toggleCampaign: (campaignId) => {
        set(state => {
          const idx = state.selectedCampaignIds.indexOf(campaignId)
          if (idx > -1) {
            state.selectedCampaignIds.splice(idx, 1)
            state.selectedCampaignsDetails = state.selectedCampaignsDetails
              .filter(c => c.campaign_id !== campaignId)
          } else {
            state.selectedCampaignIds.push(campaignId)
          }
        })
      },
      
      setFormField: (key, value) => {
        set(state => {
          state.formData[key] = value
        })
      },
      
      setValidation: (step, result) => {
        set(state => {
          state.validations[step] = result
        })
      },
      
      uploadLeadList: (campaignId, data) => {
        set(state => {
          state.campaignLeadLists[campaignId] = data
        })
      },
      
      reset: () => set(initialState),
    })),
    {
      name: 'delivery-checklist-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist essential data, not loading states
        activeTab: state.activeTab,
        selectedCampaignIds: state.selectedCampaignIds,
        formData: state.formData,
        validations: state.validations,
      }),
    }
  )
)
```

### 4.3 Updated Component Usage

```typescript
// page.tsx - simplified
'use client'

import { useEffect } from 'react'
import { useDeliveryChecklist } from '@/store/delivery-checklist'

export default function DeliveryChecklistPage() {
  const {
    activeTab,
    loading,
    validations,
  } = useDeliveryChecklist()
  
  // Load clients on mount
  useEffect(() => {
    useDeliveryChecklist.getState().loadClients()
  }, [])
  
  return (
    <div className="min-h-screen">
      <Header />
      <ProgressBar validations={validations} />
      <Tabs value={activeTab} onValueChange={/* ... */}>
        {/* Each component reads its own state slice */}
        <TabsContent value="client-campaign">
          <ClientCampaignSelector />
        </TabsContent>
        {/* ... */}
      </Tabs>
    </div>
  )
}

// ClientCampaignSelector.tsx - reads only what it needs
export function ClientCampaignSelector() {
  const clients = useDeliveryChecklist(s => s.clients)
  const campaigns = useDeliveryChecklist(s => s.campaigns)
  const formData = useDeliveryChecklist(s => s.formData)
  const selectClient = useDeliveryChecklist(s => s.selectClient)
  const loading = useDeliveryChecklist(s => s.loading)
  
  // Component only re-renders when these specific values change
  // ...
}
```

---

## 5. Real-time Features

### 5.1 Streaming AI Responses

**Implementation using Server-Sent Events (SSE):**

```typescript
// /app/api/validate-campaign/stream/route.ts
import { Anthropic } from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
      
      // Send initial status
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))
      
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          stream: true,
          messages: [{ role: 'user', content: buildPrompt(body) }],
        })
        
        for await (const event of response) {
          if (event.type === 'content_block_delta') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`
            ))
          }
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (error) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
        ))
      }
      
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Client-side consumption:**

```typescript
// hooks/useStreamingValidation.ts
export function useStreamingValidation() {
  const [progress, setProgress] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [result, setResult] = useState<ValidationResponse | null>(null)
  
  const validate = async (payload: ValidateCampaignRequest) => {
    setIsStreaming(true)
    setProgress('')
    
    const response = await fetch('/api/validate-campaign/stream', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))
          
          if (data.type === 'delta') {
            setProgress(prev => prev + data.text)
          } else if (data.type === 'done') {
            // Parse accumulated JSON
            const parsed = parseValidationResult(progress)
            setResult(parsed)
          }
        }
      }
    }
    
    setIsStreaming(false)
  }
  
  return { validate, progress, isStreaming, result }
}
```

### 5.2 Live Collaboration (Future Enhancement)

For multi-user editing on the same checklist:

```
┌─────────────────────────────────────────────────────────────────┐
│                     COLLABORATION LAYER                          │
│                                                                  │
│  Option A: Liveblocks (Recommended for speed-to-market)         │
│  - Built-in presence, cursors, comments                         │
│  - Works with Zustand                                           │
│  - Conflict resolution handled                                  │
│                                                                  │
│  Option B: Socket.io + CRDT (Y.js)                              │
│  - More control, open source                                    │
│  - More complex to implement                                    │
│  - Better for very custom use cases                             │
└─────────────────────────────────────────────────────────────────┘
```

**Quick Liveblocks Integration:**

```typescript
// liveblocks.config.ts
import { createClient } from '@liveblocks/client'
import { liveblocks } from '@liveblocks/zustand'

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_KEY!,
})

// Wrap existing store
export const useDeliveryChecklist = create<DeliveryChecklistState>()(
  liveblocks(
    persist(
      immer((set, get) => ({ /* ... */ })),
      { /* persist config */ }
    ),
    {
      client,
      presenceMapping: { cursor: true, selection: true },
      storageMapping: { formData: true, validations: true },
    }
  )
)
```

---

## 6. Testing Strategy

### 6.1 Current State: Zero Tests 🔴

No test files found in the codebase.

### 6.2 Proposed Testing Pyramid

```
                    ┌───────────┐
                    │    E2E    │  ← 10% (Playwright)
                   ┌┴───────────┴┐
                  │  Integration  │  ← 30% (API + Component)
                 ┌┴───────────────┴┐
                │    Unit Tests     │  ← 60% (Functions + Hooks)
               └────────────────────┘
```

### 6.3 Unit Tests (Vitest)

```typescript
// __tests__/lib/lead-validation.test.ts
import { describe, it, expect } from 'vitest'
import { 
  validateSingleEmail, 
  parseLeadCSVString,
  deduplicateLeads 
} from '@/lib/lead-validation'

describe('validateSingleEmail', () => {
  it('validates correct email format', () => {
    const result = validateSingleEmail('john@company.com')
    expect(result.isValid).toBe(true)
    expect(result.isGeneric).toBe(false)
  })
  
  it('rejects disposable domains', () => {
    const result = validateSingleEmail('test@tempmail.com')
    expect(result.isValid).toBe(false)
    expect(result.isDisposable).toBe(true)
  })
  
  it('flags generic emails', () => {
    const result = validateSingleEmail('info@company.com')
    expect(result.isValid).toBe(true)
    expect(result.isGeneric).toBe(true)
    expect(result.warnings).toContain('Generic/role-based email address')
  })
  
  it('handles malformed emails', () => {
    expect(validateSingleEmail('')).toHaveProperty('isValid', false)
    expect(validateSingleEmail('not-an-email')).toHaveProperty('isValid', false)
    expect(validateSingleEmail('@no-local.com')).toHaveProperty('isValid', false)
  })
})

describe('parseLeadCSVString', () => {
  it('parses simple CSV with headers', () => {
    const csv = `email,first_name,company
john@test.com,John,Acme Inc
jane@test.com,Jane,Corp Co`
    
    const result = parseLeadCSVString(csv)
    expect(result.leads).toHaveLength(2)
    expect(result.leads[0].email).toBe('john@test.com')
    expect(result.stats.successfulRows).toBe(2)
  })
  
  it('handles missing email column', () => {
    const csv = `name,company\nJohn,Acme`
    const result = parseLeadCSVString(csv)
    expect(result.parseErrors[0].error).toContain('No email column')
  })
  
  it('handles quoted values with commas', () => {
    const csv = `email,company
john@test.com,"Acme, Inc."`
    const result = parseLeadCSVString(csv)
    expect(result.leads[0].company).toBe('Acme, Inc.')
  })
})

describe('deduplicateLeads', () => {
  it('removes exact duplicates', () => {
    const leads = [
      { email: 'john@test.com' },
      { email: 'john@test.com' },
      { email: 'jane@test.com' },
    ]
    const { unique, duplicates } = deduplicateLeads(leads)
    expect(unique).toHaveLength(2)
    expect(duplicates).toHaveLength(1)
  })
  
  it('is case-insensitive', () => {
    const leads = [
      { email: 'John@Test.com' },
      { email: 'john@test.com' },
    ]
    const { unique } = deduplicateLeads(leads)
    expect(unique).toHaveLength(1)
  })
})
```

```typescript
// __tests__/lib/email-analysis.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeEmailCopy, analyzeSubjectLine } from '@/lib/email-analysis'

describe('analyzeSubjectLine', () => {
  it('penalizes ALL CAPS', () => {
    const result = analyzeSubjectLine('FREE OFFER TODAY ONLY')
    expect(result.hasAllCaps).toBe(true)
    expect(result.score).toBeLessThan(70)
  })
  
  it('detects personalization', () => {
    const result = analyzeSubjectLine('{{first_name}}, quick question')
    expect(result.hasPersonalization).toBe(true)
  })
  
  it('warns about length', () => {
    const short = analyzeSubjectLine('Hi')
    const long = analyzeSubjectLine('A'.repeat(80))
    expect(short.issues).toContainEqual(expect.stringContaining('too short'))
    expect(long.issues).toContainEqual(expect.stringContaining('truncated'))
  })
})

describe('analyzeEmailCopy', () => {
  it('detects spam words', () => {
    const result = analyzeEmailCopy(
      'FREE money guaranteed',
      'Act now for a risk-free opportunity'
    )
    expect(result.spam.spamWordsFound.length).toBeGreaterThan(0)
    expect(result.spam.score).toBeLessThan(80)
  })
  
  it('gives high score to clean copy', () => {
    const result = analyzeEmailCopy(
      '{{first_name}}, quick question about your team',
      'I noticed your company recently expanded. Would love to share how we helped similar teams.'
    )
    expect(result.overallScore).toBeGreaterThan(80)
  })
})
```

### 6.4 Integration Tests (API Routes)

```typescript
// __tests__/api/validate-campaign.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/validate-campaign/route'
import { NextRequest } from 'next/server'

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            score: 85,
            summary: 'Good campaign',
            issues: [],
            suggestions: ['Consider A/B testing subject lines'],
          })
        }]
      })
    }
  }))
}))

describe('/api/validate-campaign', () => {
  it('validates required fields', async () => {
    const request = new NextRequest('http://localhost/api/validate-campaign', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.message).toContain('Missing required fields')
  })
  
  it('returns validation results', async () => {
    const request = new NextRequest('http://localhost/api/validate-campaign', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'test-123',
        platform: 'instantly',
        emailSequence: [{ subject: 'Test', body: 'Hello', step: 1 }],
        leadList: [{ email: 'test@test.com' }],
        icpDescription: 'Tech executives',
      }),
    })
    
    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.validation.score).toBeGreaterThan(0)
  })
  
  it('GET returns health status', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.status).toBe('ok')
    expect(data.endpoint).toBe('/api/validate-campaign')
  })
})
```

### 6.5 Component Tests (React Testing Library)

```typescript
// __tests__/components/EmailCopyAndLeads.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmailCopyAndLeads } from '@/components/delivery-checklist/EmailCopyAndLeads'

const mockCampaigns = [
  {
    campaign_id: 'camp-1',
    campaign_name: 'Test Campaign',
    platform: 'instantly',
    status: 'active',
    sequences: [
      { step: 1, subject: 'Hello {{first_name}}', body: 'Test body' }
    ]
  }
]

describe('EmailCopyAndLeads', () => {
  it('shows warning when no campaigns selected', () => {
    render(
      <EmailCopyAndLeads
        clientId=""
        clientName=""
        platform="instantly"
        selectedCampaigns={[]}
        validation={{ status: 'idle', message: '' }}
        onValidate={vi.fn()}
        getValidationCard={vi.fn()}
      />
    )
    
    expect(screen.getByText(/Please select a client/)).toBeInTheDocument()
  })
  
  it('renders email sequences for selected campaigns', () => {
    render(
      <EmailCopyAndLeads
        clientId="client-1"
        clientName="Test Client"
        platform="instantly"
        selectedCampaigns={mockCampaigns}
        validation={{ status: 'idle', message: '' }}
        onValidate={vi.fn()}
        getValidationCard={vi.fn()}
      />
    )
    
    expect(screen.getByText('Test Campaign')).toBeInTheDocument()
    expect(screen.getByText(/Email 1/)).toBeInTheDocument()
  })
  
  it('handles CSV upload', async () => {
    const onLeadDataChange = vi.fn()
    
    render(
      <EmailCopyAndLeads
        clientId="client-1"
        clientName="Test Client"
        platform="instantly"
        selectedCampaigns={mockCampaigns}
        validation={{ status: 'idle', message: '' }}
        onValidate={vi.fn()}
        getValidationCard={vi.fn()}
        onLeadDataChange={onLeadDataChange}
      />
    )
    
    const file = new File(
      ['email,first_name\njohn@test.com,John'],
      'leads.csv',
      { type: 'text/csv' }
    )
    
    const input = screen.getByLabelText(/upload/i) || 
                  document.querySelector('input[type="file"]')!
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(onLeadDataChange).toHaveBeenCalled()
    })
  })
})
```

### 6.6 E2E Tests (Playwright)

```typescript
// e2e/delivery-checklist.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Delivery Checklist Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/delivery-checklist')
  })
  
  test('completes full validation workflow', async ({ page }) => {
    // Step 1: Select client
    await page.getByRole('combobox', { name: /client/i }).click()
    await page.getByRole('option').first().click()
    
    // Wait for campaigns to load
    await page.waitForSelector('[data-testid="campaign-list"]')
    
    // Select a campaign
    await page.getByRole('checkbox').first().click()
    
    // Validate Step 1
    await page.getByRole('button', { name: /validate/i }).click()
    await expect(page.getByText(/validated successfully/i)).toBeVisible()
    
    // Move to next tab
    await page.getByRole('tab', { name: /mailbox health/i }).click()
    
    // ... continue flow
  })
  
  test('handles large CSV upload', async ({ page }) => {
    // Pre-select client and campaign
    // ...
    
    // Navigate to Email Copy & Leads tab
    await page.getByRole('tab', { name: /copy.*leads/i }).click()
    
    // Upload large CSV
    const fileChooser = await page.waitForEvent('filechooser')
    await fileChooser.setFiles('fixtures/50k-leads.csv')
    
    // Should show progress indicator
    await expect(page.getByText(/analyzing/i)).toBeVisible()
    
    // Should eventually show results (longer timeout)
    await expect(page.getByText(/leads/i)).toBeVisible({ timeout: 30000 })
  })
})
```

### 6.7 Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'components/**', 'app/api/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

---

## 7. API Design

### 7.1 Current API Issues

| Endpoint | Issue | Severity |
|----------|-------|----------|
| `/api/validate-campaign` | No rate limiting | 🔴 Critical |
| `/api/process-leads` | 50MB limit too high for serverless | 🟡 High |
| All endpoints | No authentication | 🔴 Critical |
| All endpoints | No versioning | 🟡 Medium |
| All endpoints | Inconsistent error format | 🟡 Medium |

### 7.2 API v2 Design

**Base URL:** `/api/v2`

**Standard Response Format:**
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  meta?: {
    requestId: string
    timestamp: string
    processingMs: number
  }
}
```

**Authentication:**
```typescript
// Middleware: /middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Skip public routes
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }
  
  // Verify JWT
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' }},
      { status: 401 }
    )
  }
  
  try {
    const user = await verifyAuth(token)
    const response = NextResponse.next()
    response.headers.set('x-user-id', user.id)
    return response
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid auth token' }},
      { status: 401 }
    )
  }
}

export const config = {
  matcher: '/api/:path*',
}
```

**Rate Limiting:**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

// Different limits for different endpoints
export const rateLimiters = {
  validation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 validations per minute
    analytics: true,
  }),
  leads: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 uploads per minute
    analytics: true,
  }),
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),
}

export async function checkRateLimit(
  limiter: keyof typeof rateLimiters,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { success, remaining, reset } = await rateLimiters[limiter].limit(identifier)
  return { success, remaining, reset: reset.getTime() }
}
```

### 7.3 v2 Endpoints

```
POST   /api/v2/campaigns/validate
       - Streaming response for AI validation
       - Rate limit: 10/min
       
POST   /api/v2/leads/process  
       - Chunked upload for large files
       - Rate limit: 20/min
       
GET    /api/v2/leads/process/:jobId
       - Poll for async job status
       
POST   /api/v2/leads/process/stream
       - SSE stream for real-time processing updates
       
GET    /api/v2/clients
       - Cached, paginated
       - Rate limit: 100/min
       
GET    /api/v2/clients/:id/campaigns
       - Cached, paginated
       
GET    /api/v2/health
       - No auth required
       - Returns service status
```

### 7.4 OpenAPI Spec (excerpt)

```yaml
openapi: 3.1.0
info:
  title: Delivery Checklist API
  version: 2.0.0

paths:
  /api/v2/campaigns/validate:
    post:
      summary: Validate campaign with AI
      tags: [Validation]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ValidateCampaignRequest'
      responses:
        '200':
          description: Validation complete
          content:
            text/event-stream:
              schema:
                type: string
                description: SSE stream of validation progress
        '429':
          $ref: '#/components/responses/RateLimited'

components:
  schemas:
    ValidateCampaignRequest:
      type: object
      required:
        - campaignId
        - platform
        - emailSequence
        - leadList
        - icpDescription
      properties:
        campaignId:
          type: string
        platform:
          type: string
          enum: [instantly, bison]
        emailSequence:
          type: array
          items:
            $ref: '#/components/schemas/EmailSequence'
        leadList:
          type: array
          items:
            $ref: '#/components/schemas/Lead'
          maxItems: 1000
          description: Sample of leads (full list processed separately)
        icpDescription:
          type: string
          maxLength: 5000
```

---

## 8. Database Migration

### 8.1 Current State: JSON Files

```
/data/
├── best-practices.json     (54KB, static)
└── client-context/
    ├── _example.json
    └── test-client.json    (per-client ICP/notes)
```

**Problems:**
- No ACID guarantees
- No concurrent write safety
- No indexes or queries
- No relationships
- No audit trail

### 8.2 Migration Triggers

**Migrate when ANY of these become true:**

| Trigger | Threshold | Current |
|---------|-----------|---------|
| Concurrent users | >10 | ~5 |
| Client contexts | >100 | ~5 |
| Validation history needed | Yes | No |
| Multi-team access | Yes | No |
| Audit requirements | Yes | No |

### 8.3 Recommended: PostgreSQL + Prisma

**Schema Design:**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(STRATEGIST)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  checklists DeliveryChecklist[]
  
  @@index([email])
}

enum Role {
  ADMIN
  MANAGER
  STRATEGIST
}

model Client {
  id                  String   @id @default(cuid())
  name                String
  platform            Platform
  workspaceId         String?
  
  // ICP Context
  icpSummary          String?  @db.Text
  specialRequirements String?  @db.Text
  transcriptNotes     String?  @db.Text
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  campaigns           Campaign[]
  checklists          DeliveryChecklist[]
  
  @@index([name])
  @@index([platform])
}

enum Platform {
  INSTANTLY
  BISON
}

model Campaign {
  id          String       @id @default(cuid())
  externalId  String       // ID from Instantly/Bison
  name        String
  status      CampaignStatus
  client      Client       @relation(fields: [clientId], references: [id])
  clientId    String
  
  sequences   EmailSequence[]
  checklists  ChecklistCampaign[]
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@unique([clientId, externalId])
  @@index([clientId])
  @@index([status])
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

model EmailSequence {
  id         String   @id @default(cuid())
  step       Int
  subject    String
  body       String   @db.Text
  waitDays   Int?
  
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  campaignId String
  
  @@unique([campaignId, step])
}

model DeliveryChecklist {
  id           String            @id @default(cuid())
  status       ChecklistStatus   @default(DRAFT)
  
  // Relationships
  user         User              @relation(fields: [userId], references: [id])
  userId       String
  client       Client            @relation(fields: [clientId], references: [id])
  clientId     String
  
  // Form Data
  fathomMeetingId   String?
  strategyTranscript String?     @db.Text
  intakeFormUrl      String?
  strategistNotes    String?     @db.Text
  
  // Validation Results
  validations  ValidationResult[]
  campaigns    ChecklistCampaign[]
  leadLists    LeadList[]
  
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  submittedAt  DateTime?
  
  @@index([userId])
  @@index([clientId])
  @@index([status])
  @@index([createdAt])
}

enum ChecklistStatus {
  DRAFT
  IN_PROGRESS
  SUBMITTED
  APPROVED
  REJECTED
}

model ChecklistCampaign {
  id          String            @id @default(cuid())
  checklist   DeliveryChecklist @relation(fields: [checklistId], references: [id])
  checklistId String
  campaign    Campaign          @relation(fields: [campaignId], references: [id])
  campaignId  String
  
  @@unique([checklistId, campaignId])
}

model ValidationResult {
  id           String            @id @default(cuid())
  step         String            // 'clientCampaign', 'mailboxHealth', 'emailCopyLeads'
  status       ValidationStatus
  message      String
  details      Json?             // Flexible storage for detailed results
  aiResponse   Json?             // Raw AI response for debugging
  
  checklist    DeliveryChecklist @relation(fields: [checklistId], references: [id])
  checklistId  String
  
  createdAt    DateTime          @default(now())
  
  @@index([checklistId, step])
}

enum ValidationStatus {
  IDLE
  VALIDATING
  PASS
  FAIL
  WARNING
}

model LeadList {
  id           String            @id @default(cuid())
  filename     String
  fileSize     Int
  totalLeads   Int
  validLeads   Int
  invalidLeads Int
  duplicates   Int
  
  // Stored in S3/R2, just reference here
  fileUrl      String?
  
  // Analysis results
  fieldCoverage Json?
  distributions Json?
  issues        Json?
  
  checklist    DeliveryChecklist @relation(fields: [checklistId], references: [id])
  checklistId  String
  campaignId   String            // Which campaign this list is for
  
  createdAt    DateTime          @default(now())
  
  @@index([checklistId])
}

model BestPractice {
  id        String   @id @default(cuid())
  category  String   // 'copy', 'leads', 'deliverability'
  title     String
  content   String   @db.Text
  priority  Int      @default(0)
  active    Boolean  @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([category, active])
}
```

### 8.4 Migration Steps

```bash
# 1. Install dependencies
npm install @prisma/client prisma

# 2. Initialize Prisma
npx prisma init

# 3. Create migration
npx prisma migrate dev --name init

# 4. Seed best practices
npx prisma db seed
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bestPractices from '../data/best-practices.json'

const prisma = new PrismaClient()

async function main() {
  // Migrate best practices from JSON
  for (const guide of bestPractices.guides) {
    await prisma.bestPractice.upsert({
      where: { id: guide.id },
      update: {
        title: guide.title,
        category: guide.category,
        content: guide.content,
      },
      create: {
        id: guide.id,
        title: guide.title,
        category: guide.category,
        content: guide.content,
      },
    })
  }
  
  console.log('Seeded best practices')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 8.5 Data Access Layer

```typescript
// lib/db/checklists.ts
import { prisma } from './client'
import type { DeliveryChecklist, Prisma } from '@prisma/client'

export async function createChecklist(
  userId: string,
  clientId: string
): Promise<DeliveryChecklist> {
  return prisma.deliveryChecklist.create({
    data: {
      userId,
      clientId,
      status: 'DRAFT',
    },
    include: {
      client: true,
      campaigns: { include: { campaign: true } },
    },
  })
}

export async function getChecklistWithDetails(id: string) {
  return prisma.deliveryChecklist.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      client: true,
      campaigns: {
        include: {
          campaign: {
            include: { sequences: { orderBy: { step: 'asc' } } },
          },
        },
      },
      validations: { orderBy: { createdAt: 'desc' } },
      leadLists: true,
    },
  })
}

export async function saveValidationResult(
  checklistId: string,
  step: string,
  result: {
    status: ValidationStatus
    message: string
    details?: any
    aiResponse?: any
  }
) {
  return prisma.validationResult.upsert({
    where: {
      checklistId_step: { checklistId, step },
    },
    update: result,
    create: {
      checklistId,
      step,
      ...result,
    },
  })
}
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Add Zustand for state management
- [ ] Split `EmailCopyAndLeads.tsx` into smaller components
- [ ] Add basic Vitest unit tests for `/lib`
- [ ] Add request rate limiting with Upstash

### Phase 2: Performance (Week 3-4)
- [ ] Implement streaming CSV processing
- [ ] Add SWR for data fetching/caching
- [ ] Add streaming AI responses (SSE)
- [ ] Add progress persistence (sessionStorage)

### Phase 3: Reliability (Week 5-6)
- [ ] Set up PostgreSQL + Prisma
- [ ] Migrate from JSON files to database
- [ ] Add integration tests for API routes
- [ ] Add component tests with RTL

### Phase 4: Scale (Week 7-8)
- [ ] Add background job processing (Inngest/BullMQ)
- [ ] Move large CSV storage to S3/R2
- [ ] Add E2E tests with Playwright
- [ ] Deploy to production with monitoring

---

## 10. Cost Implications

| Item | Current | At 10x Scale | Monthly Cost |
|------|---------|--------------|--------------|
| Vercel Pro | - | Required | $20 |
| PostgreSQL (Supabase/Neon) | - | Required | $25-50 |
| Redis (Upstash) | - | Required | $10 |
| Claude API | ~$50 | ~$500 | Variable |
| File Storage (R2) | - | Required | $5 |
| **Total** | **~$50** | **~$600** | - |

---

## Appendix A: Component Refactoring

### Breaking Up EmailCopyAndLeads (1566 lines)

```
EmailCopyAndLeads.tsx (1566 lines)
    │
    ▼ Refactor into:
    
components/delivery-checklist/email-copy/
├── EmailCopyAndLeads.tsx        (~200 lines, orchestrator)
├── CampaignAccordion.tsx        (~150 lines)
├── EmailSequenceCard.tsx        (~200 lines)
├── EmailPreview.tsx             (~150 lines)
├── EmailQualityAnalysis.tsx     (~100 lines, already exists inline)
├── LeadListUpload.tsx           (~150 lines)
├── LeadListDownloads.tsx        (~100 lines)
├── MergeFieldHighlighter.tsx    (~100 lines)
└── hooks/
    ├── useEmailAnalysis.ts      (~50 lines)
    ├── useLeadPreview.ts        (~80 lines)
    └── useLeadUpload.ts         (~100 lines)
```

---

## Appendix B: Monitoring & Observability

**Recommended Stack:**
- **Error Tracking:** Sentry
- **Analytics:** PostHog (self-hostable)
- **Uptime:** Better Uptime
- **Logs:** Axiom or Logtail

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

export function trackValidation(campaignId: string, result: 'pass' | 'fail' | 'warning') {
  Sentry.metrics.increment('validation.completed', 1, {
    tags: { result },
  })
}

export function trackCSVProcessing(leadCount: number, processingMs: number) {
  Sentry.metrics.distribution('csv.processing_time', processingMs, {
    tags: { size: leadCount > 10000 ? 'large' : 'small' },
  })
}
```

---

*Document generated by AI. Review and adapt for specific organizational needs.*
