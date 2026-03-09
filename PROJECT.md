# Mission Control Dashboard - Project Summary

**Created:** 2026-03-09  
**For:** Artistuta  
**Location:** `/Users/Openclaw/.openclaw/workspace/mission-control/`

## Overview

Futuristic command center dashboard for personal life and business management. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, custom dark theme
- **Icons:** Lucide React
- **Fonts:** Inter (sans-serif), JetBrains Mono (monospace)
- **Data Storage:** JSON files (no database)
- **Deployment:** Vercel-ready, local dev server

## Project Structure

```
mission-control/
├── app/
│   ├── api/
│   │   ├── todos/          # Todo List REST API
│   │   ├── events/         # Agent Events REST API
│   │   └── agents/         # Agent Registry API
│   ├── layout.tsx
│   ├── page.tsx            # Main dashboard layout
│   └── globals.css
├── components/
│   ├── Pulse.tsx           # Header with clock, title, North Star, status
│   ├── BrainSection.tsx    # Quick notes + priorities
│   ├── FeedSection-vertical.tsx  # Agent activity feed (main)
│   ├── StatsSection.tsx    # Metrics + financials
│   └── TodoSection-compact.tsx   # Todo list with agent assignment
├── hooks/
│   ├── useTodos.ts         # Todo management hook
│   └── useEvents.ts        # Events management hook
├── data/                   # Auto-generated JSON storage
│   ├── todos.json
│   └── events.json
├── examples/               # Integration examples
└── docs/                   # API documentation
```

## Core Features

### 1. The Pulse (Header)
- **Real-time clock** with date/time (seconds precision)
- **Artistuta Mission Control** title with gradient
- **North Star quote** with animated indicators
- **Status toggle:** Online / Focus Mode / Offline (color-coded, glowing)
- **Gradient background** from dark gray to black

### 2. Todo List (Left Column - Top)
**Agent-based task management**
- Assign todos to specific agents (MONDAY, BLUEPRINT, SWISS, etc.)
- **Filter tabs:** Pending (default), All, per-agent
- **Visual indicators:** 
  - Left border color = agent color
  - Agent icon (🧠💻⚙️📈✨🔭❤️)
  - Agent tag badge
- **Optimistic updates** for instant UI feedback
- Checkbox to complete/uncomplete
- REST API backend (`/api/todos`)

### 3. Brain Section (Left Column - Bottom)
- **Quick Capture:** Textarea for brain dumps (localStorage)
- **Top 3 Priorities:** Checklist with localStorage persistence

### 4. Agent Activity Feed (Center Column)
**Multi-agent event stream with vertical swimlanes**

**Layout:**
- Grid 3 columns (wraps to multiple rows)
- Each agent = one card with dynamic height
- Max ~5 events visible, scroll for more

**Agents (in order):**
1. MONDAY (🧠 Brain) - Yellow - Main Coordinator
2. BLUEPRINT (💻 Code) - Blue - Engineering
3. QUANT (📈 TrendingUp) - Purple/Magenta - Finance
4. SWISS (⚙️ Settings) - Red - Operations
5. PIXAR (✨ Sparkles) - Orange - Creative
6. HUBBLE (🔭 Telescope) - Pink - Research
7. MARCUS (❤️ Heart) - Green - Wellness
8. SYSTEM (🖥️ Server) - Gray - System (last)

**Event Types with Status:**
- **Tasks:**
  - ✅ Completed (green border)
  - 🟡 In Progress (yellow border)
  - ⚪ Pending (gray border)
  - 🔴 Blocked (red border)
- **Notifications:**
  - 🔴 Critical/Error (red border)
  - 🟡 Warning (yellow border)
  - 🟢 Info/Success (green border)
  - ⚪ Normal (gray border)
- **System events**
- **Manual logs**

**Features:**
- **Tab filters:** All, Task, System, Notification (with counts)
- **Auto-refresh:** Poll every 5 seconds
- **Real-time add:** Log events from any agent via UI
- **Agent info cards:** Role, description, status (active/standby)
- **Color-coded:** Each agent has unique color + icon
- **Auto-discovery:** New agents appear automatically
- **Status indicators:** Border color + badge for tasks/notifications

### 5. Stats Section (Right Column)
- **Day Completion:** Progress bar (7 AM - 11 PM)
- **Financials:** MRR, Revenue, Growth (static placeholders)
- **Metrics:** Deep Work Hours, Tasks Completed, Focus Score

## APIs

### Todo List API
**Base:** `/api/todos`

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  agent?: string;  // NEW: Agent assignment
  createdAt: string;
  updatedAt: string;
}
```

**Endpoints:**
- `GET /api/todos` - List all
- `POST /api/todos` - Create (body: `{title, agent?}`)
- `GET /api/todos/:id` - Get single
- `PUT /api/todos/:id` - Update (body: `{title?, completed?, agent?}`)
- `DELETE /api/todos/:id` - Delete single
- `DELETE /api/todos` - Delete all

**Features:**
- JSON file storage (`data/todos.json`)
- Optimistic updates via React hook
- Agent assignment support

### Agent Events API
**Base:** `/api/events`

```typescript
interface Event {
  id: string;
  timestamp: string; // ISO 8601
  agent: string;     // MONDAY, BLUEPRINT, etc.
  type: string;      // task, notification, system, manual
  message: string;
  metadata?: {
    status?: string;    // for tasks: completed, in-progress, pending, blocked
    severity?: string;  // for notifications: critical, warning, info, normal
    [key: string]: any;
  };
}
```

**Endpoints:**
- `GET /api/events` - List all (sorted newest first)
- `GET /api/events?agent=MONDAY` - Filter by agent
- `GET /api/events?limit=10` - Limit results
- `POST /api/events` - Create event
- `DELETE /api/events/:id` - Delete single
- `DELETE /api/events` - Delete all
- `POST /api/events/seed` - Seed demo data

**Features:**
- Auto-generated timestamps
- Agent-based filtering
- Real-time UI polling (5s)
- Event type classification
- Metadata support for task status / notification severity

### Agents API
**Base:** `/api/agents`

```typescript
interface Agent {
  id: string;
  name: string;
  color: string;      // Hex color
  status: "active" | "standby" | "offline";
  description: string;
  role: string;
  icon: string;       // Lucide icon name
}
```

**Endpoint:**
- `GET /api/agents` - List all known agents

**Known Agents:**
- MONDAY, BLUEPRINT, QUANT, SWISS, PIXAR, HUBBLE, MARCUS, SYSTEM

## Design System

### Colors
```javascript
const AGENT_COLORS = {
  MONDAY: "#fbbf24",    // Yellow
  BLUEPRINT: "#3b82f6", // Blue
  QUANT: "#d946ef",     // Purple/Magenta
  SWISS: "#ef4444",     // Red
  PIXAR: "#ff7700",     // Orange
  HUBBLE: "#ec4899",    // Pink
  MARCUS: "#22c55e",    // Green
  SYSTEM: "#888888",    // Gray
};

const TASK_STATUS_COLORS = {
  completed: "#22c55e",     // Green
  "in-progress": "#fbbf24", // Yellow
  pending: "#9ca3af",       // Gray
  blocked: "#ef4444",       // Red
};

const NOTIFICATION_SEVERITY_COLORS = {
  critical: "#ef4444",  // Red
  warning: "#fbbf24",   // Yellow
  info: "#22c55e",      // Green
  normal: "#9ca3af",    // Gray
};
```

### Typography
- **Headers:** Inter (sans-serif)
- **Data/Code:** JetBrains Mono (monospace)

### Theme
- **Background:** `#0a0a0a` (deep black)
- **Cards:** `#0f0f0f` / `#1a1a1a` (dark gray)
- **Borders:** `#2a2a2a` (subtle gray)
- **Text:** `#ededed` (off-white)
- **Accent Gradients:** Cyan → Magenta

## Running the Project

```bash
# Install dependencies
cd mission-control
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

**Dev Server:** `http://localhost:3000` (or 3001 if 3000 in use)

## Key Implementation Details

### Dynamic Height Cards
```typescript
// Agent cards adjust height based on events
style={{ 
  ...(agentEvents.length === 0 && { minHeight: "60px" }),
  ...(agentEvents.length > 5 && { maxHeight: "400px" })
}}
```

### Optimistic Updates
```typescript
// UI updates immediately, API call in background
const previousState = [...data];
setState(newState);
try {
  await api.update(newState);
} catch {
  setState(previousState); // Revert on error
}
```

### Grid Layout
```css
/* 3-column grid with auto-sizing rows */
grid-cols-3 gap-4
gridAutoRows: min-content
```

## Agent Integration

### From Shell/Scripts
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "MONDAY",
    "type": "task",
    "message": "Created slide deck",
    "metadata": {"status": "completed"}
  }'
```

### From OpenClaw Sessions
```typescript
await fetch('http://localhost:3000/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent: 'BLUEPRINT',
    type: 'task',
    message: 'API endpoint deployed',
    metadata: { status: 'completed' }
  })
});
```

## Future Enhancements

- [ ] WebSocket for real-time push updates
- [ ] Calendar integration
- [ ] Backend API for live financial data
- [ ] Mobile responsive design
- [ ] Event retention policy
- [ ] Export events/todos as JSON/CSV
- [ ] Agent performance metrics dashboard
- [ ] Webhook listeners for external services (GitHub, Stripe, etc.)
- [ ] Voice input for todo/event logging
- [ ] Dark/Light theme toggle

## Development Timeline

**Session:** 2026-03-09 08:00 - 12:06 (4+ hours)

**Key Milestones:**
1. Initial project setup + base dashboard layout
2. Todo List API + UI with agent assignment
3. Agent Events API + vertical swimlane feed
4. Task status indicators (left border + badges)
5. Notification severity system
6. Filter tabs for events (All/Task/System/Notification)
7. Filter tabs for todos (Pending/All/per-agent)
8. Agent icons + color-coded UI
9. Dynamic card heights
10. Enhanced header with Artistuta branding

## Notes

- All data persists in JSON files (no database required)
- localStorage used for Brain section (notes/priorities)
- Auto-refresh every 5 seconds for events
- Optimistic updates for instant UI feedback
- Grid layout prevents cards from overlapping
- Status indicators consistent across task/notification types
- Agent discovery is automatic (new agents appear when first event posted)

## Contact

For questions about this project, contact via:
- OpenClaw TUI
- Telegram (Monday agent)
- Mission Control dashboard UI (log manual events)

---

**Last Updated:** 2026-03-09 12:06 GMT+7  
**Status:** ✅ Production Ready  
**Token Usage:** ~133k / 200k
