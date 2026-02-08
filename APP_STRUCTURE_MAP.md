# High-Ticket Strategist Portal - App Structure Map

> Generated: 2026-02-08
> Framework: Next.js 16 (App Router) + React 19 + TypeScript
> Purpose: AI-powered campaign validation and management platform for high-ticket email outreach

---

## 📁 Complete Route Tree

### Page Routes (`app/`)

```
/                           → Dashboard (Main overview page)
/login                      → Login page (auth)
├── layout.tsx              → Login-specific layout

/(dashboard)/               → Dashboard route group (with Sidebar layout)
├── campaigns/page.tsx      → Campaigns overview (placeholder)
├── clients/page.tsx        → Client management
├── delivery-checklist/page.tsx → Multi-step campaign submission wizard
├── mailbox-health/page.tsx → Mailbox health dashboard
├── submissions/page.tsx    → Submission history (placeholder)
└── admin/
    ├── users/page.tsx      → User management (admin only)
    └── requirements/page.tsx → Requirements editor (admin only)
```

### API Routes (`app/api/`)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/auth/login` | POST | User authentication | ✅ Complete |
| `/api/auth/logout` | POST | User logout | ✅ Complete |
| `/api/auth/me` | GET | Get current user | ✅ Complete |
| `/api/campaigns` | GET | List campaigns for client | ✅ Complete |
| `/api/campaigns/details` | GET | Get campaign sequences | ✅ Complete |
| `/api/clients` | GET | List all clients (Instantly + Bison) | ✅ Complete |
| `/api/mailbox-health` | GET | Aggregate mailbox health | ✅ Complete |
| `/api/mailbox-delete` | POST | Delete mailbox from platform | ✅ Complete |
| `/api/warmup-analytics` | POST | Instantly warmup analytics | ✅ Complete |
| `/api/bison-warmup` | POST | Bison warmup analytics | ✅ Complete |
| `/api/bison/sender-emails` | GET | Bison sender accounts | ✅ Complete |
| `/api/users` | GET/POST | List/create users | ✅ Complete |
| `/api/users/[id]` | POST/DELETE | Reset password/delete user | ✅ Complete |
| `/api/requirements` | GET/POST | List/create requirements | ✅ Complete |
| `/api/requirements/[slug]` | GET/PUT/DELETE | CRUD requirements | ✅ Complete |
| `/api/gmail/search` | GET | Search Gmail threads | ✅ Complete |
| `/api/gmail/thread` | GET | Get Gmail thread messages | ✅ Complete |
| `/api/slack/channels` | GET | List Slack channels | ✅ Complete |
| `/api/slack/history` | GET | Get Slack channel history | ✅ Complete |
| `/api/fathom/transcript` | GET | Get Fathom transcript | ✅ Complete |
| `/api/fathom/summary` | GET | Get Fathom meeting summary | ✅ Complete |
| `/api/fathom/action-items` | GET | Get Fathom action items | ✅ Complete |

---

## 🧩 Component Inventory

### Layout Components (`components/layout/`)

| Component | Purpose | Status |
|-----------|---------|--------|
| `Header.tsx` | Page header with title/description | ✅ Complete |
| `Sidebar.tsx` | Main navigation sidebar | ✅ Complete |

### UI Components (`components/ui/`)

All shadcn/ui based components:

| Component | Purpose | Status |
|-----------|---------|--------|
| `badge.tsx` | Status/label badges | ✅ Complete |
| `button.tsx` | Button variants | ✅ Complete |
| `card.tsx` | Card containers | ✅ Complete |
| `collapsible.tsx` | Expandable sections | ✅ Complete |
| `dialog.tsx` | Modal dialogs | ✅ Complete |
| `dropdown-menu.tsx` | Dropdown menus | ✅ Complete |
| `input.tsx` | Text inputs | ✅ Complete |
| `label.tsx` | Form labels | ✅ Complete |
| `progress.tsx` | Progress bars | ✅ Complete |
| `select.tsx` | Select dropdowns | ✅ Complete |
| `separator.tsx` | Visual separators | ✅ Complete |
| `table.tsx` | Data tables | ✅ Complete |
| `tabs.tsx` | Tab navigation | ✅ Complete |
| `textarea.tsx` | Multi-line inputs | ✅ Complete |
| `tooltip.tsx` | Hover tooltips | ✅ Complete |

### Feature Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `WarmupModal.tsx` | Detailed warmup analytics modal | ✅ Complete |

---

## 🔧 Lib Utilities

| File | Purpose | External APIs | Status |
|------|---------|---------------|--------|
| `bison.ts` | Bison API client | Bison API (send.leadgenjay.com) | ✅ Complete |
| `instantly.ts` | Instantly API client | Instantly.ai API | ✅ Complete |
| `sheets.ts` | Google Sheets client data | Google Sheets CSV export | ✅ Complete |
| `slack.ts` | Slack API client | Slack Web API | ✅ Complete |
| `fathom.ts` | Fathom API client | Fathom.ai API | ✅ Complete |
| `users.ts` | User management | Google Apps Script | ✅ Complete |
| `requirements.ts` | Requirements file CRUD | Local filesystem | ✅ Complete |
| `utils.ts` | General utilities (cn, etc.) | - | ✅ Complete |

---

## 🧭 Main User Journeys/Flows

### 1. Campaign Delivery Flow (Primary)
**Route:** `/delivery-checklist`
**Status:** ✅ Substantially Complete (UI 90%, validation logic 60%)

```
┌─────────────────────────────────────────────────────────────────┐
│  DELIVERY CHECKLIST WIZARD (5-Step Process)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Strategy Call Reference                                │
│  ├── Select client from dropdown                               │
│  ├── Search Gmail for client email threads                     │
│  ├── Load Slack channel context (optional)                     │
│  ├── Add Fathom meeting ID (optional)                          │
│  └── AI validates ICP extraction                               │
│                                                                 │
│  Step 2: Infrastructure Setup                                   │
│  ├── Auto-loads mailbox health for client                      │
│  ├── Shows healthy/warning/critical mailboxes                  │
│  ├── Checks warmup completion (14+ days)                       │
│  └── AI validates infrastructure readiness                     │
│                                                                 │
│  Step 3: Email Copy                                             │
│  ├── Loads all campaigns for client                            │
│  ├── Shows email sequences with spintax                        │
│  ├── Merge field highlighting                                  │
│  └── AI validates copy quality + spam score                    │
│                                                                 │
│  Step 4: Lead List                                              │
│  ├── CSV upload per campaign                                   │
│  ├── Field validation                                          │
│  ├── Sample lead preview                                       │
│  └── AI validates ICP match                                    │
│                                                                 │
│  Step 5: Loom Video                                             │
│  ├── Loom URL input                                            │
│  └── AI validates explanation completeness                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Mailbox Health Monitoring
**Route:** `/mailbox-health`
**Status:** ✅ Complete

```
┌─────────────────────────────────────────────────────────────────┐
│  MAILBOX HEALTH DASHBOARD                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overview Stats                                                 │
│  ├── Total mailboxes (Instantly + Bison)                       │
│  ├── Clients ready vs not ready                                │
│  ├── Warmup not enabled count                                  │
│  └── Still warming count                                       │
│                                                                 │
│  Filtering                                                      │
│  ├── All / Not Ready / Not Enabled / Warming / Ready          │
│  ├── Search by email or client                                 │
│  └── CSV export                                                │
│                                                                 │
│  Client Groups (Collapsible)                                   │
│  ├── Ready percentage with progress bar                        │
│  ├── Issue badges (not enabled, warming)                       │
│  ├── Expandable mailbox table                                  │
│  └── Delete mailbox action                                     │
│                                                                 │
│  Warmup Details Modal                                          │
│  ├── Summary stats                                             │
│  └── Per-account breakdown                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Client Management
**Route:** `/clients`
**Status:** ✅ Complete

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT MANAGEMENT                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stats: Total / Instantly / Bison counts                       │
│  Search: Filter by name or platform                            │
│  Client Cards: Name, platform badge, workspace info            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Admin: User Management
**Route:** `/admin/users`
**Status:** ✅ Complete

```
Create user → Generate temp password → Reset password → Delete
```

### 5. Admin: Requirements Editor
**Route:** `/admin/requirements`
**Status:** ✅ Complete

```
List .md files → Edit with markdown → Preview → Save
```

---

## 📊 Feature Status Summary

| Feature | Page | API | Data Flow | AI Validation | Status |
|---------|------|-----|-----------|---------------|--------|
| **Dashboard** | ✅ | N/A | N/A | N/A | ⚠️ Hardcoded data |
| **Delivery Checklist** | ✅ | ✅ | ✅ | 🔨 Mock | 90% |
| **Mailbox Health** | ✅ | ✅ | ✅ | N/A | ✅ Complete |
| **Clients** | ✅ | ✅ | ✅ | N/A | ✅ Complete |
| **Campaigns** | ⬜ | ✅ | ✅ | N/A | 🔨 Placeholder |
| **Submissions** | ⬜ | ⬜ | ⬜ | ⬜ | 🔨 Placeholder |
| **User Management** | ✅ | ✅ | ✅ | N/A | ✅ Complete |
| **Requirements** | ✅ | ✅ | ✅ | N/A | ✅ Complete |
| **Login/Auth** | ✅ | ✅ | ✅ | N/A | ✅ Complete |

---

## 🔌 External Integrations

| Service | Purpose | Auth Method | Status |
|---------|---------|-------------|--------|
| **Bison API** | Email sending platform | API Key (per client) | ✅ |
| **Instantly.ai** | Email sending platform | API Key (per client) | ✅ |
| **Google Sheets** | Client credentials store | Public CSV export | ✅ |
| **Google Apps Script** | User management | Env var | ✅ |
| **Gmail API** | Search client emails | OAuth (server-side) | ✅ |
| **Slack API** | Load channel history | Bot token | ✅ |
| **Fathom API** | Meeting transcripts | API Key | ✅ |

---

## 🚧 Known Gaps / TODOs

### High Priority
1. **AI Validation Integration** - `handleValidate()` in delivery-checklist returns mock data
2. **Dashboard Stats** - Currently hardcoded, needs real data aggregation
3. **Submissions Page** - Placeholder, needs submission history/storage
4. **Campaigns Page** - Placeholder, campaigns work via delivery-checklist

### Medium Priority
5. **Lead List Validation** - Basic CSV parsing done, no ICP matching
6. **Loom Integration** - URL input only, no transcript extraction
7. **Submission Persistence** - No database, submissions not saved

### Low Priority
8. **Settings Page** - Referenced in sidebar but doesn't exist
9. **Real-time Updates** - Mailbox health uses 60s cache, no WebSocket
10. **Activity Feed** - Dashboard activity is mock data

---

## 📁 Config Files

```
frontend/
├── config/
│   └── requirements/        # Markdown requirement files
├── .env.local               # Environment variables
├── next.config.ts           # Next.js config
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

### Required Environment Variables
```bash
GOOGLE_SCRIPT_URL=           # Google Apps Script for user management
SLACK_BOT_TOKEN=             # Slack API bot token
FATHOM_API_KEY=              # Fathom.ai API key
# Gmail OAuth handled separately
```

---

## 🏗️ Architecture Notes

1. **No Database** - All data from external APIs/Google Sheets
2. **In-Memory Caching** - 60s for mailbox health, 5min for credentials
3. **Request Deduplication** - Prevents duplicate API calls
4. **Server Components** - Uses 'use client' directive for interactive pages
5. **shadcn/ui** - Radix UI primitives + Tailwind styling
