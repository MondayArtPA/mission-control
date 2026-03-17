# Shared Bus — Architecture Design

## Overview
Inter-agent communication system ให้ 8 agents share knowledge, ส่ง message, และ delegate tasks ระหว่างกัน

## 3 Features

### 1. Knowledge Sharing
- Agent เขียน knowledge ลง shared bus → agent อื่นอ่านได้
- ตัวอย่าง: Quant วิเคราะห์ cost data → เขียนสรุปลง bus → Monday อ่านไปใช้ brief Art

### 2. Agent-to-Agent Messaging
- Agent ส่ง message/request หา agent อื่นโดยตรง
- ตัวอย่าง: Blueprint ขอ Quant คำนวณ cost ก่อน deploy

### 3. Task Delegation
- Agent มอบหมาย sub-task ให้ agent อื่น
- ตัวอย่าง: Monday แตก task ย่อยให้ Blueprint + Quant ทำพร้อมกัน

## Architecture: Hybrid (File + API)

```
┌─────────────────────────────────────────┐
│           Mission Control API            │
│  POST /api/bus/message  (send)           │
│  GET  /api/bus/inbox     (read inbox)    │
│  POST /api/bus/knowledge (share)         │
│  GET  /api/bus/knowledge (search)        │
│  POST /api/bus/delegate  (assign task)   │
│  GET  /api/bus/feed      (activity feed) │
└─────────────┬───────────────────────────┘
              │ reads/writes
              ▼
┌─────────────────────────────────────────┐
│     ~/.openclaw/workspace/bus/           │
│                                          │
│  messages/                               │
│    2026-03-16-<id>.json    ← individual  │
│    inbox-monday.json       ← per-agent   │
│    inbox-blueprint.json                  │
│                                          │
│  knowledge/                              │
│    <topic>-<date>.md       ← shared docs │
│    index.json              ← search idx  │
│                                          │
│  delegations/                            │
│    <task-id>.json          ← sub-tasks   │
└─────────────────────────────────────────┘
```

## Data Models

### BusMessage
```typescript
interface BusMessage {
  id: string;              // "msg-<timestamp>-<random>"
  from: AgentName;         // sender agent
  to: AgentName | "all";   // recipient or broadcast
  type: "message" | "request" | "response" | "knowledge" | "delegation";
  subject: string;         // short summary
  body: string;            // full content
  priority: "low" | "normal" | "high" | "urgent";
  replyTo?: string;        // message id this replies to
  taskId?: string;         // linked Mission Control task
  createdAt: string;       // ISO timestamp
  readAt?: string;         // when recipient read it
  status: "pending" | "read" | "replied" | "expired";
}
```

### KnowledgeEntry
```typescript
interface KnowledgeEntry {
  id: string;
  author: AgentName;
  topic: string;           // e.g. "expense-march-2026", "true-corp-5g-plan"
  tags: string[];          // searchable tags
  content: string;         // markdown content
  createdAt: string;
  updatedAt: string;
  accessCount: number;     // how many times other agents read it
}
```

### DelegationRecord
```typescript
interface DelegationRecord {
  id: string;
  parentTaskId?: string;   // Mission Control task that spawned this
  from: AgentName;         // delegating agent
  to: AgentName;           // assigned agent
  title: string;
  detail: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "completed" | "rejected";
  result?: string;         // response from assigned agent
  createdAt: string;
  completedAt?: string;
}
```

## Agent Integration

Each agent gets these instructions in IDENTITY.md:

```
## Shared Bus — Inter-Agent Communication

คุณสามารถสื่อสารกับ agent อื่นผ่าน Shared Bus:

### อ่าน inbox
exec: cat ~/.openclaw/workspace/bus/messages/inbox-<your-name>.json

### ส่ง message
exec: cat > ~/.openclaw/workspace/bus/messages/msg-$(date +%s).json << 'EOF'
{"from":"<you>","to":"<agent>","type":"message","subject":"...","body":"..."}
EOF

### Share knowledge
exec: cat > ~/.openclaw/workspace/bus/knowledge/<topic>.md << 'EOF'
# <topic>
<content>
EOF

### Delegate task
exec: cat > ~/.openclaw/workspace/bus/delegations/del-$(date +%s).json << 'EOF'
{"from":"<you>","to":"<agent>","title":"...","detail":"...","priority":"normal"}
EOF
```

## API Endpoints (Mission Control)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/bus/message | Send message between agents |
| GET | /api/bus/inbox/:agent | Get agent's inbox |
| POST | /api/bus/knowledge | Share knowledge entry |
| GET | /api/bus/knowledge | Search knowledge (query param: ?q=topic&tags=x) |
| POST | /api/bus/delegate | Create delegation |
| GET | /api/bus/delegations/:agent | Get delegations for agent |
| GET | /api/bus/feed | Activity feed (all bus activity) |

## Dashboard UI

New "Bus" section in Mission Control sidebar:
- **Message Feed** — real-time view of inter-agent messages
- **Knowledge Base** — searchable shared knowledge entries
- **Delegations** — active sub-task assignments between agents
