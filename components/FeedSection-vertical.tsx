"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Code,
  GitCommitHorizontal,
  Heart,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Sparkles,
  Telescope,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { useMissionStatus } from "@/hooks/useStatus";
import Link from "next/link";
import type { ExpenseBreakdownWithShare } from "@/types/expenses";

const ICON_MAP: Record<string, any> = {
  Brain,
  Code,
  TrendingUp,
  Settings,
  Sparkles,
  Telescope,
  Heart,
  Server,
};

const TASK_STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  "in-progress": "#fbbf24",
  pending: "#9ca3af",
  blocked: "#ef4444",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  pending: "Pending",
  blocked: "Blocked",
};

const NOTIFICATION_SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  error: "#ef4444",
  warning: "#fbbf24",
  info: "#22c55e",
  success: "#22c55e",
  normal: "#9ca3af",
};

const NOTIFICATION_SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  error: "Error",
  warning: "Warning",
  info: "Info",
  success: "Success",
  normal: "Normal",
};

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

interface Agent {
  id: string;
  name: string;
  color: string;
  status: "active" | "standby" | "offline";
  description: string;
  role: string;
  icon: string;
}

function getTaskStatus(event: { type: string; metadata?: Record<string, any> }) {
  if (typeof event.metadata?.taskStatus === "string") return event.metadata.taskStatus;
  if (typeof event.metadata?.status === "string" && ["pending", "in-progress", "completed", "blocked"].includes(event.metadata.status)) {
    return event.metadata.status;
  }
  if (event.type === "task-created") return "pending";
  if (event.type === "task-started") return "in-progress";
  if (event.type === "task-blocked") return "blocked";
  if (event.type === "task-completed") return "completed";
  return null;
}

export default function FeedSection() {
  const { events, loading, error, addEvent, deleteAllEvents } = useEvents();
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("MONDAY");
  const [isAdding, setIsAdding] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const { status: missionStatus } = useMissionStatus();
  const agentSpendMap = useMemo(() => {
    const map = new Map<string, ExpenseBreakdownWithShare>();
    const breakdown = missionStatus?.expenses.breakdownByAgent ?? [];
    breakdown.forEach((item) => map.set(item.key.toUpperCase(), item));
    return map;
  }, [missionStatus]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        if (data.success) setAgentsList(data.data);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      }
    };
    fetchAgents();
  }, []);

  const handleAddEvent = async () => {
    if (!newMessage.trim()) return;
    setIsAdding(true);
    try {
      await addEvent({ agent: selectedAgent, type: "manual", message: newMessage, metadata: { source: "mission-control-manual-log" } });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const getConciseEventMessage = (event: (typeof events)[number]) => {
    const taskResult = typeof event.metadata?.result === "string" ? event.metadata.result : "";
    const normalizedResult = taskResult.replace(/\s+/g, " ").trim();
    const [firstSentence] = normalizedResult.split(/(?<=[.!?])\s+/);
    const concise = firstSentence && firstSentence.length > 0 ? firstSentence : event.message;
    return concise.length > 120 ? `${concise.slice(0, 117)}...` : concise;
  };

  const filteredEvents = filterType === "all" ? events : events.filter((e) => e.type === filterType);
  const eventsByAgent = filteredEvents.reduce((acc, event) => {
    if (!acc[event.agent]) acc[event.agent] = [];
    acc[event.agent].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  const eventTypes = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedEventTypes = Object.keys(eventTypes).sort((a, b) => a.localeCompare(b));

  return (
    <div className="border border-border rounded-[24px] p-4 bg-[#0f0f0f] min-h-[720px] flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent-magenta" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Activity Feed</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-gray-500">{filteredEvents.length} events</div>
            {events.length > 0 && (
              <button onClick={deleteAllEvents} className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-500 hover:text-red-400" title="Clear all events">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-border flex-wrap">
          <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 text-xs font-mono uppercase transition-all ${filterType === "all" ? "bg-accent-cyan/10 text-accent-cyan border-b-2 border-accent-cyan" : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"}`}>
            All <span className="opacity-60">({events.length})</span>
          </button>
          {sortedEventTypes.map((type) => (
            <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 text-xs font-mono uppercase transition-all ${filterType === type ? "bg-accent-cyan/10 text-accent-cyan border-b-2 border-accent-cyan" : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"}`}>
              {type} <span className="opacity-60">({eventTypes[type]})</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">{error}</div>}

      <div className="flex-1 overflow-y-auto mb-4 grid grid-cols-1 gap-4 pr-2 2xl:grid-cols-3 xl:grid-cols-2" style={{ gridAutoRows: "min-content" }}>
        {loading && events.length === 0 && <div className="flex items-center justify-center w-full text-gray-500"><RefreshCw size={24} className="animate-spin" /></div>}
        {!loading && events.length === 0 && <div className="flex items-center justify-center w-full text-gray-500 text-sm">No activity yet.</div>}

        {agentsList.map((agent) => {
          const agentEvents = eventsByAgent[agent.name] || [];
          const AgentIcon = ICON_MAP[agent.icon] || Activity;

          return (
            <div key={agent.id} className={`border border-border rounded-lg overflow-hidden flex flex-col bg-[#1a1a1a] transition-all h-fit ${agentEvents.length === 0 ? "opacity-40" : ""}`}>
              <div className="p-3 text-white font-semibold uppercase tracking-wide text-sm flex items-center justify-between border-b border-border" style={{ background: agent.color + "15" }}>
                <div className="flex items-center gap-2">
                  <AgentIcon size={16} style={{ color: agent.color }} />
                  <span style={{ color: agent.color }}>{agent.name}</span>
                </div>
                <div className="text-xs px-2 py-1 rounded" style={{ background: agent.color + "22", color: agent.color }}>{agent.role}</div>
              </div>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-border">{agent.description}</div>
              <div className="overflow-y-auto space-y-1 p-2" style={{ ...(agentEvents.length === 0 && { minHeight: "60px" }), ...(agentEvents.length > 5 && { maxHeight: "400px" }) }}>
                {agentEvents.length === 0 ? (
                  <div className="text-xs text-gray-600 py-4 text-center">No events</div>
                ) : (
                  agentEvents.slice(0, 20).map((event) => {
                    const taskStatus = getTaskStatus(event);
                    const isNotification = event.type === "notification";
                    const taskColor = taskStatus ? TASK_STATUS_COLORS[taskStatus] : undefined;
                    const notifSeverity = event.metadata?.severity || "normal";
                    const notifColor = isNotification ? NOTIFICATION_SEVERITY_COLORS[notifSeverity] : undefined;
                    const borderColor = taskColor || notifColor;
                    const label = taskStatus ? TASK_STATUS_LABELS[taskStatus] : isNotification ? NOTIFICATION_SEVERITY_LABELS[notifSeverity] : null;
                    const labelColor = taskColor || notifColor;
                    const commit = event.metadata?.commit;
                    const area = event.metadata?.area;

                    return (
                      <div key={event.id} className="text-xs p-2 bg-[#111] rounded hover:bg-[#222] transition-colors border border-border/30 relative" style={borderColor ? { borderLeftWidth: "3px", borderLeftColor: borderColor } : {}}>
                        <div className="flex justify-between mb-1 gap-2">
                          <span className="text-gray-500 font-mono">{new Date(event.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {label && labelColor && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: labelColor + "22", color: labelColor }}>{label}</span>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: agent.color + "22", color: agent.color }}>{event.type}</span>
                            {commit && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-accent-amber bg-accent-amber/10"><GitCommitHorizontal size={10} />{String(commit).slice(0, 7)}</span>}
                          </div>
                        </div>
                        <p className="text-gray-300 break-words">{getConciseEventMessage(event)}</p>
                        {area && <div className="mt-2 text-[11px] font-mono uppercase tracking-wide text-gray-500">Area: {area}</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <div className="text-xs text-gray-500">Manual entries are notes only. Authoritative task state lives in the task board.</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="min-h-[44px] rounded border border-border bg-[#1a1a1a] px-3 py-2 text-sm font-mono transition-colors focus:border-accent-cyan focus:outline-none sm:w-48">
            {agentsList.map((agent) => <option key={agent.id} value={agent.name}>{agent.name} - {agent.role}</option>)}
          </select>
          <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEvent()} placeholder="Add context note (not a completion status)" disabled={isAdding} className="min-h-[44px] flex-1 rounded border border-border bg-[#1a1a1a] px-3 py-2 text-sm font-mono transition-colors focus:border-accent-magenta focus:outline-none disabled:opacity-50" />
          <button onClick={handleAddEvent} disabled={isAdding || !newMessage.trim()} className="min-h-[44px] rounded bg-accent-magenta px-4 py-2 font-semibold text-background transition-colors hover:bg-accent-magenta/80 disabled:cursor-not-allowed disabled:opacity-50">
            {isAdding ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
