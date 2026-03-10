export type AgentName =
  | "monday"
  | "blueprint"
  | "quant"
  | "swiss"
  | "pixar"
  | "hubble"
  | "marcus"
  | "system";

export interface AgentProfile {
  id: AgentName;
  label: string;
  codename: string;
  icon: string;
  role: string;
  defaultModel: string;
  description: string;
}

export const AGENT_DIRECTORY: Record<AgentName, AgentProfile> = {
  monday: {
    id: "monday",
    label: "MONDAY",
    codename: "Lead Ops",
    icon: "🧠",
    role: "Thinking Partner",
    defaultModel: "sonnet-4.5",
    description: "Central orchestrator + decision support",
  },
  blueprint: {
    id: "blueprint",
    label: "BLUEPRINT",
    codename: "Builder",
    icon: "🔧",
    role: "Systems & shipping",
    defaultModel: "gpt-5.1-codex",
    description: "Builds code, infra, dashboards",
  },
  quant: {
    id: "quant",
    label: "QUANT",
    codename: "Finance",
    icon: "📊",
    role: "ROI & capital",
    defaultModel: "haiku-4.5",
    description: "Modeling + investment analysis",
  },
  swiss: {
    id: "swiss",
    label: "SWISS",
    codename: "Ops",
    icon: "⚙️",
    role: "Workflow & automation",
    defaultModel: "qwen3-14b",
    description: "Keeps the machine running",
  },
  pixar: {
    id: "pixar",
    label: "PIXAR",
    codename: "Creative",
    icon: "🎨",
    role: "Content & decks",
    defaultModel: "sonnet-4.6",
    description: "Storytelling + assets",
  },
  hubble: {
    id: "hubble",
    label: "HUBBLE",
    codename: "Intel",
    icon: "🔭",
    role: "Research + signals",
    defaultModel: "mixtral",
    description: "Scans markets + AI intel",
  },
  marcus: {
    id: "marcus",
    label: "MARCUS",
    codename: "Advisor",
    icon: "🧘",
    role: "Health & clarity",
    defaultModel: "opus-mini",
    description: "Mind/body OS & counsel",
  },
  system: {
    id: "system",
    label: "SYSTEM",
    codename: "Infra",
    icon: "🛰️",
    role: "Pipelines & glue",
    defaultModel: "automation",
    description: "Bridges agents + gateways",
  },
};

export const AGENT_LIST = Object.values(AGENT_DIRECTORY);

export type AgentStatus = "active" | "busy" | "idle";

export interface AgentOverview {
  id: AgentName;
  label: string;
  icon: string;
  status: AgentStatus;
  statusEmoji: string;
  currentTask: string;
  queueCount: number;
  model: string;
  sessionTime: string;
  lastActive: string;
  priorityLoad: {
    critical: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  };
}

export type PriorityLevel = "CRITICAL" | "P1" | "P2" | "P3" | "P4";

export const PRIORITY_LEVELS: PriorityLevel[] = ["CRITICAL", "P1", "P2", "P3", "P4"];

export const PRIORITY_META: Record<PriorityLevel, { label: string; short: string; color: string; bg: string; ring: string }> = {
  CRITICAL: {
    label: "Critical",
    short: "CRIT",
    color: "text-red-300",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
  },
  P1: {
    label: "P1",
    short: "P1",
    color: "text-orange-300",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/30",
  },
  P2: {
    label: "P2",
    short: "P2",
    color: "text-yellow-200",
    bg: "bg-yellow-500/10",
    ring: "ring-yellow-500/30",
  },
  P3: {
    label: "P3",
    short: "P3",
    color: "text-sky-200",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
  },
  P4: {
    label: "P4",
    short: "P4",
    color: "text-gray-300",
    bg: "bg-gray-500/10",
    ring: "ring-gray-500/30",
  },
};

export type TaskStatus = "queued" | "in_progress" | "completed" | "cancelled";

export interface TaskRecord {
  id: string;
  agent: AgentName;
  priority: PriorityLevel;
  status: TaskStatus;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  resultSummary?: string | null;
  attachments?: string[];
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  source: AgentName | "art";
  type: "task_created" | "task_updated" | "task_completed" | "status" | "note";
  message: string;
  priority?: PriorityLevel;
}

export interface AgentDetailSnapshot {
  overview: AgentOverview;
  tasks: TaskRecord[];
}
