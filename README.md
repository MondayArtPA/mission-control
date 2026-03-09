# Mission Control

> **Futuristic command center for personal life and business management**

A real-time dashboard featuring agent-based activity streams, intelligent task management, and system monitoring. Built for power users who want complete operational visibility.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Agent Activity Feed
Multi-agent event stream with vertical swimlanes. Each agent has:
- Unique color + icon identity
- Dynamic height cards (auto-adjusts to content)
- Real-time updates (5s polling)
- Task status tracking (Completed/In Progress/Pending/Blocked)
- Notification severity (Critical/Warning/Info/Normal)

**8 Specialized Agents:**
- 🧠 **MONDAY** (Yellow) - Main Coordinator & Personal Assistant
- 💻 **BLUEPRINT** (Blue) - Engineering & Build Systems
- 📈 **QUANT** (Purple) - Finance & ROI Analysis
- ⚙️ **SWISS** (Red) - Operations & Workflow Automation
- ✨ **PIXAR** (Orange) - Creative & Content
- 🔭 **HUBBLE** (Pink) - Research & Intelligence
- ❤️ **MARCUS** (Green) - Health & Wellness
- 🖥️ **SYSTEM** (Gray) - Infrastructure Monitoring

### ✅ Smart Todo List
- **Agent assignment** - Delegate tasks to specific agents
- **Filter views** - Pending (default), All, or per-agent
- **Visual indicators** - Color-coded left borders + agent icons
- **Optimistic updates** - Instant UI feedback
- **REST API** - Full CRUD operations

### ⏰ The Pulse
- Real-time clock with live seconds
- **Artistuta Mission Control** branding
- Animated North Star quote
- Status toggle (Online/Focus/Offline) with glow effects

### 📊 System Stats
- Day completion progress (7 AM - 11 PM)
- Financial metrics (MRR, Revenue, Growth)
- Performance indicators
- Deep work hours tracking

### 🧠 Brain Section
- Quick capture notes (localStorage)
- Top 3 priorities checklist

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

**Development:** http://localhost:3000

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS |
| **Icons** | Lucide React |
| **Fonts** | Inter (UI), JetBrains Mono (Data) |
| **Data** | JSON file storage |
| **Deployment** | Vercel-ready |

## 📡 API Reference

### Events API

```bash
# Create event
POST /api/events
Content-Type: application/json
{
  "agent": "MONDAY",
  "type": "task",
  "message": "Completed slide deck",
  "metadata": { "status": "completed" }
}

# Get all events
GET /api/events

# Filter by agent
GET /api/events?agent=BLUEPRINT

# Seed demo data
POST /api/events/seed
```

### Todos API

```bash
# Create todo
POST /api/todos
{
  "title": "Review PR #142",
  "agent": "BLUEPRINT"
}

# Get all todos
GET /api/todos

# Update todo
PUT /api/todos/:id
{
  "completed": true
}
```

### Agents API

```bash
# Get all agents
GET /api/agents
```

See [API Documentation](./app/api/) for full details.

## 🔌 Agent Integration

### From Shell

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "SWISS",
    "type": "notification",
    "message": "Backup completed",
    "metadata": {"severity": "info"}
  }'
```

### From Node.js / TypeScript

```typescript
await fetch('http://localhost:3000/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent: 'BLUEPRINT',
    type: 'task',
    message: 'Deployed to production',
    metadata: { status: 'completed' }
  })
});
```

### From Python

```python
import requests

requests.post('http://localhost:3000/api/events', json={
    "agent": "QUANT",
    "type": "notification",
    "message": "ROI analysis ready",
    "metadata": {"severity": "info"}
})
```

See [examples/](./examples/) for webhook integrations (GitHub, Stripe, etc.)

## 🎨 Design System

### Colors

```typescript
MONDAY: "#fbbf24"    // Yellow
BLUEPRINT: "#3b82f6" // Blue
QUANT: "#d946ef"     // Purple
SWISS: "#ef4444"     // Red
PIXAR: "#ff7700"     // Orange
HUBBLE: "#ec4899"    // Pink
MARCUS: "#22c55e"    // Green
SYSTEM: "#888888"    // Gray
```

### Status Colors

**Tasks:**
- 🟢 Completed: `#22c55e`
- 🟡 In Progress: `#fbbf24`
- ⚪ Pending: `#9ca3af`
- 🔴 Blocked: `#ef4444`

**Notifications:**
- 🔴 Critical: `#ef4444`
- 🟡 Warning: `#fbbf24`
- 🟢 Info: `#22c55e`
- ⚪ Normal: `#9ca3af`

## 📂 Project Structure

```
mission-control/
├── app/
│   ├── api/              # REST APIs
│   │   ├── todos/        # Todo management
│   │   ├── events/       # Event stream
│   │   └── agents/       # Agent registry
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Dashboard
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── Pulse.tsx         # Header
│   ├── TodoSection-compact.tsx
│   ├── FeedSection-vertical.tsx
│   ├── BrainSection.tsx
│   └── StatsSection.tsx
├── hooks/                # Custom React hooks
│   ├── useTodos.ts
│   └── useEvents.ts
├── data/                 # JSON storage (auto-generated)
├── examples/             # Integration examples
└── docs/                 # Documentation
```

## 🔧 Configuration

### Environment Variables

```env
# Optional - defaults shown
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Customization

**Change wake/sleep times** (`components/StatsSection.tsx`):
```typescript
wakeTime.setHours(7, 0, 0, 0);   // 7 AM
sleepTime.setHours(23, 0, 0, 0); // 11 PM
```

**Update North Star quote** (`components/Pulse.tsx`):
```typescript
"Build systems that scale, not just tasks."
```

**Add new agent** (`app/api/agents/route.ts`):
```typescript
{
  id: "agent-id",
  name: "AGENT_NAME",
  color: "#hexcode",
  status: "standby",
  description: "Agent description",
  role: "Role",
  icon: "LucideIconName",
}
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t mission-control .
docker run -p 3000:3000 mission-control
```

## 🛣️ Roadmap

- [ ] WebSocket for real-time push
- [ ] Calendar integration
- [ ] Mobile responsive design
- [ ] Voice input for logging
- [ ] Event retention policy
- [ ] Export data (JSON/CSV)
- [ ] Agent performance analytics
- [ ] Webhook listeners (GitHub, Stripe)
- [ ] Dark/Light theme toggle
- [ ] Multi-user support

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🤝 Contributing

This is a personal project, but suggestions welcome via issues.

## 📧 Contact

- **Project Owner:** Artistuta
- **Created:** 2026-03-09
- **Maintained by:** OpenClaw Agents (MONDAY, BLUEPRINT)

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
