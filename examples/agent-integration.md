# Agent Integration Examples

How to integrate OpenClaw agents with Mission Control Event Feed.

## From OpenClaw Sessions

### MONDAY Agent Example

```typescript
// In MONDAY's task completion
async function reportToMissionControl(message: string, metadata = {}) {
  try {
    await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'MONDAY',
        type: 'task',
        message,
        metadata
      })
    });
  } catch (error) {
    console.error('Failed to report to Mission Control:', error);
  }
}

// Usage
await reportToMissionControl('Created slide deck', {
  file: 'Thailand_AI_Adoption_2026.pptx',
  slides: 8,
  duration: '15min'
});
```

### BLUEPRINT Agent Example

```typescript
// Report build/code events
async function reportBuild(action: string, details: any) {
  await fetch('http://localhost:3000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'BLUEPRINT',
      type: 'task',
      message: action,
      metadata: details
    })
  });
}

// Usage
await reportBuild('Dashboard deployed', {
  url: 'http://localhost:3000',
  components: 5,
  lines: 2500
});
```

## From Shell Scripts

### Bash Example

```bash
#!/bin/bash

# Function to report event
report_event() {
  local agent=$1
  local message=$2
  
  curl -X POST http://localhost:3000/api/events \
    -H "Content-Type: application/json" \
    -d "{\"agent\":\"$agent\",\"type\":\"task\",\"message\":\"$message\"}"
}

# Usage
report_event "SWISS" "Backup completed successfully"
report_event "HUBBLE" "Found 5 new AI research papers"
```

### Python Example

```python
import requests
import json

def report_event(agent, message, event_type="task", metadata=None):
    url = "http://localhost:3000/api/events"
    payload = {
        "agent": agent,
        "type": event_type,
        "message": message,
        "metadata": metadata or {}
    }
    
    try:
        response = requests.post(url, json=payload)
        return response.json()
    except Exception as e:
        print(f"Failed to report event: {e}")
        return None

# Usage
report_event("QUANT", "ROI analysis completed", metadata={
    "investment": 100000,
    "projected_return": 125000,
    "roi_percent": 25
})
```

## Webhook Integration

### GitHub Webhook

```typescript
// app/api/webhooks/github/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('x-hub-signature-256');
  // Verify signature...
  
  const payload = await request.json();
  
  // Report to Mission Control
  await fetch('http://localhost:3000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'SYSTEM',
      type: 'notification',
      message: `GitHub: ${payload.action} on ${payload.repository.name}`,
      metadata: {
        source: 'github',
        action: payload.action,
        repo: payload.repository.full_name,
        url: payload.repository.html_url
      }
    })
  });
  
  return Response.json({ ok: true });
}
```

### Stripe Webhook

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  // Verify signature...
  
  const event = await request.json();
  
  if (event.type === 'payment_intent.succeeded') {
    await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'QUANT',
        type: 'notification',
        message: `Payment received: $${event.data.object.amount / 100}`,
        metadata: {
          source: 'stripe',
          amount: event.data.object.amount,
          currency: event.data.object.currency,
          customer: event.data.object.customer
        }
      })
    });
  }
  
  return Response.json({ received: true });
}
```

## Scheduled Tasks

### Cron Job Example

```bash
# crontab -e
# Every hour, check system status
0 * * * * /usr/local/bin/check-system-health.sh

# check-system-health.sh
#!/bin/bash

CPU=$(top -l 1 | grep "CPU usage" | awk '{print $3}')
MEM=$(top -l 1 | grep "PhysMem" | awk '{print $2}')

curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{
    \"agent\":\"SYSTEM\",
    \"type\":\"notification\",
    \"message\":\"Health check: CPU $CPU, Memory $MEM\",
    \"metadata\":{\"cpu\":\"$CPU\",\"memory\":\"$MEM\"}
  }"
```

## OpenClaw Cron Integration

```yaml
# In OpenClaw config
cron:
  jobs:
    - name: "Daily Summary"
      schedule:
        kind: "cron"
        expr: "0 18 * * *"  # 6 PM daily
        tz: "Asia/Bangkok"
      payload:
        kind: "systemEvent"
        text: |
          curl -X POST http://localhost:3000/api/events \
            -H "Content-Type: application/json" \
            -d '{"agent":"MONDAY","type":"notification","message":"Daily summary ready"}'
```

## Best Practices

1. **Agent Naming** - Use uppercase (MONDAY, BLUEPRINT, etc.)
2. **Message Format** - Keep concise, action-focused
3. **Metadata** - Store detailed data in metadata, not message
4. **Error Handling** - Always catch/log failed reports
5. **Rate Limiting** - Don't spam events (batch if needed)
6. **Event Types** - Use consistent types: system, task, notification
7. **Timestamps** - Server auto-generates, don't send custom timestamps

## Event Schema

```typescript
interface Event {
  id: string;          // Auto-generated
  timestamp: string;   // Auto-generated (ISO 8601)
  agent: string;       // MONDAY, BLUEPRINT, etc.
  type: string;        // system, task, notification, manual
  message: string;     // Human-readable description
  metadata?: {         // Optional structured data
    [key: string]: any;
  };
}
```
