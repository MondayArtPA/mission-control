# Agent Events API

Agent-based activity feed for Mission Control.

## Base URL

```
http://localhost:3000/api/events
```

## Endpoints

### Get All Events

```http
GET /api/events
GET /api/events?agent=MONDAY
GET /api/events?limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1773028878869",
      "timestamp": "2026-03-09T04:01:18.869Z",
      "agent": "MONDAY",
      "type": "notification",
      "message": "Agent-based feed is now live",
      "metadata": {}
    }
  ]
}
```

### Create Event

```http
POST /api/events
Content-Type: application/json

{
  "agent": "MONDAY",
  "type": "task",
  "message": "Completed slide deck",
  "metadata": {
    "duration": "15min",
    "output": "file.pptx"
  }
}
```

**Agent Names:**
- `MONDAY` - Main assistant
- `BLUEPRINT` - Build/code/systems
- `QUANT` - Finance/ROI/analysis
- `SWISS` - Operations/files/workflow
- `PIXAR` - Content/social/creative
- `HUBBLE` - Intelligence/research
- `MARCUS` - Health/wellness/wisdom
- `SYSTEM` - System events

**Event Types:**
- `system` - System-level events
- `task` - Task completion
- `notification` - Alerts/updates
- `manual` - Manual log entries

### Delete Single Event

```http
DELETE /api/events/:id
```

### Delete All Events

```http
DELETE /api/events
```

### Seed Demo Data

```http
POST /api/events/seed
```

Creates 10 sample events for testing.

## Agent Integration

### From OpenClaw Agent

```typescript
// In your agent's task completion
await fetch('http://localhost:3000/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent: 'BLUEPRINT',
    type: 'task',
    message: 'API endpoint created',
    metadata: { endpoint: '/api/events', lines: 120 }
  })
});
```

### From Shell Script

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "SWISS",
    "type": "notification",
    "message": "Backup completed"
  }'
```

### Automatic OpenClaw completion bridge

Mission Control includes a local bridge script for the current OpenClaw workflow:

```bash
npm run bridge:auto
```

It watches `~/.openclaw/subagents/runs.json` and forwards finished subagent completions into `/api/events` with `metadata.source = "openclaw-subagent-bridge"` and `metadata.status = "completed"`.

One-shot sync / backfill:

```bash
npm run bridge:sync
```

Notes:
- dedupe state is stored in `data/bridge-state.json`
- successful completed runs only (`outcome.status = ok`, `endedReason = subagent-complete`)
- agent name is inferred from multiple run signals, so labels like `blueprint-*` still work but task/result text can also attribute `MONDAY`, `QUANT`, `SWISS`, `PIXAR`, `HUBBLE`, `MARCUS`, and `SYSTEM`
- if a successful run lacks reliable attribution in `runs.json`, it is intentionally posted as `SYSTEM` instead of guessing
- this is intentionally scoped to the current local OpenClaw subagent architecture

### Webhook Listener (Future)

To receive events from external services, create a webhook route:

```typescript
// app/api/webhooks/github/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  await fetch('http://localhost:3000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'SYSTEM',
      type: 'notification',
      message: `GitHub: ${payload.action} on ${payload.repository.name}`,
      metadata: { source: 'github', ...payload }
    })
  });
  
  return Response.json({ ok: true });
}
```

## UI Features

- **Lane-based display** - Events grouped by agent
- **Color-coded agents** - Each agent has a unique color
- **Auto-refresh** - Polls every 5 seconds for new events
- **Real-time add** - Add events from any agent via UI
- **Auto-discovery** - New agents appear automatically when they post events

## Data Storage

Events are stored in `data/events.json` at the project root.

## Future Enhancements

- [ ] WebSocket for real-time push updates
- [ ] Event retention policy (auto-delete old events)
- [ ] Event search and filtering
- [ ] Export events as JSON/CSV
- [ ] Agent performance metrics
- [ ] Event notifications (browser/sound)
