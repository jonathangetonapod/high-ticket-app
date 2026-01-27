# BridgeKit MCP Integration Guide

This document explains how to connect the frontend to the BridgeKit MCP tools for fetching real client and campaign data.

## Architecture

```
Frontend (Next.js)
  ↓ HTTP Request
API Routes (/app/api/clients, /app/api/campaigns)
  ↓ MCP Tool Call
BridgeKit MCP Server
  ↓ API Call
Instantly/Bison APIs
```

## API Endpoints to Implement

### 1. GET /api/clients

**Purpose**: Fetch all clients from Instantly and Bison

**MCP Tools to Call**:
- `mcp__claude_ai_BridgeKit__get_instantly_clients()`
- `mcp__claude_ai_BridgeKit__get_bison_clients()`

**Response Format**:
```json
{
  "success": true,
  "clients": [
    {
      "id": "unique-id",
      "name": "Jeff Mikolai",
      "platform": "instantly",
      "workspaceId": "ws-123"
    }
  ]
}
```

**Implementation**:
```typescript
// app/api/clients/route.ts
export async function GET() {
  // Call BridgeKit MCP tools
  const instantlyClients = await callMCP('get_instantly_clients')
  const bisonClients = await callMCP('get_bison_clients')

  // Combine and format
  const allClients = [
    ...instantlyClients.map(c => ({
      id: c.workspace_id,
      name: c.name,
      platform: 'instantly',
      workspaceId: c.workspace_id
    })),
    ...bisonClients.map(c => ({
      id: c.workspace_id,
      name: c.name,
      platform: 'bison',
      workspaceId: c.workspace_id
    }))
  ]

  return NextResponse.json({ success: true, clients: allClients })
}
```

### 2. GET /api/campaigns

**Purpose**: Fetch campaigns for a specific client

**Query Parameters**:
- `clientName`: Name of the client (e.g., "Jeff Mikolai")
- `platform`: Either "instantly" or "bison"

**MCP Tools to Call**:
- For Instantly: `mcp__claude_ai_BridgeKit__list_instantly_campaigns(client_name)`
- For Bison: `mcp__claude_ai_BridgeKit__list_bison_campaigns(client_name)`

**Response Format**:
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "campaign-id",
      "name": "Q1 2025 Outreach",
      "status": "active",
      "emailsSent": 2847,
      "replies": 143,
      "interested": 28
    }
  ]
}
```

**Implementation**:
```typescript
// app/api/campaigns/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientName = searchParams.get('clientName')
  const platform = searchParams.get('platform')

  let campaigns
  if (platform === 'instantly') {
    campaigns = await callMCP('list_instantly_campaigns', { client_name: clientName })
  } else {
    campaigns = await callMCP('list_bison_campaigns', { client_name: clientName })
  }

  return NextResponse.json({ success: true, campaigns })
}
```

## Integration Options

### Option 1: Direct MCP Tool Calls (Recommended for Development)

If you're running this locally with Claude Desktop, you can use the MCP SDK to call tools directly from your API routes.

1. Install MCP SDK:
```bash
npm install @anthropic-ai/sdk
```

2. Set up MCP client in API routes
3. Call tools as shown above

### Option 2: Proxy through Existing Backend

If you have the `gmail-reply-tracker-mcp` backend running:

1. Add these endpoints to that backend
2. Update frontend API routes to proxy to backend:

```typescript
// app/api/clients/route.ts
export async function GET() {
  const response = await fetch('http://localhost:8000/api/clients')
  const data = await response.json()
  return NextResponse.json(data)
}
```

### Option 3: Server Actions (Next.js 14+)

Use Next.js Server Actions to call MCP tools directly:

```typescript
// app/actions/clients.ts
'use server'

export async function getClients() {
  // Call MCP tools here
  const clients = await callMCP('get_instantly_clients')
  return clients
}
```

## Testing with Mock Data

The current implementation uses mock data in the API routes. To test:

1. Visit: http://localhost:3000/submissions/new
2. Select a client from the dropdown (loads on page load)
3. Watch the campaigns dropdown populate when you select a client

## Next Steps

1. Choose an integration approach
2. Implement MCP tool calls in API routes
3. Test with real data
4. Add error handling and loading states
5. Add authentication/authorization

## BridgeKit MCP Tools Reference

Available tools:
- `get_instantly_clients()` - List all Instantly clients
- `get_bison_clients()` - List all Bison clients
- `list_instantly_campaigns(client_name)` - List campaigns for an Instantly client
- `list_bison_campaigns(client_name)` - List campaigns for a Bison client
- `get_instantly_campaign_details(client_name, campaign_id)` - Get detailed campaign info
- `get_bison_campaign_details(client_name, campaign_id)` - Get detailed campaign info

See the MCP server documentation for complete tool list and parameters.
