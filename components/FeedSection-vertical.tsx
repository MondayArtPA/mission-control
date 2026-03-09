"use client";

import { useState, useEffect } from "react";
import { Activity, Plus, Trash2, RefreshCw, Brain, Code, TrendingUp, Settings, Sparkles, Telescope, Heart, Server, GitCommitHorizontal } from "lucide-react";

// Icon map
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

// Task status colors
const TASK_STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e", // green
  "in-progress": "#fbbf24", // yellow
  pending: "#9ca3af", // gray
  blocked: "#ef4444", // red
};

const TASK_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  pending: "Pending",
  blocked: "Blocked",
};

// Notification severity colors
const NOTIFICATION_SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444", // red
  error: "#ef4444", // red
  warning: "#fbbf24", // yellow
  info: "#22c55e", // green
  success: "#22c55e", // green
  normal: "#9ca3af", // gray
};

const NOTIFICATION_SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  error: "Error",
  warning: "Warning",
  info: "Info",
  success: "Success",
  normal: "Normal",
};

import { useEvents } from "@/hooks/useEvents";

interface Agent {
  id: string;
  name: string;
  color: string;
  status: "active" | "standby" | "offline";
  description: string;
  role: string;
  icon: string;
}

export default function FeedSection() {
  const { events, loading, error, addEvent, deleteAllEvents } =
    useEvents();
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("MONDAY");
  const [isAdding, setIsAdding] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  // Fetch agents list
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        if (data.success) {
          setAgentsList(data.data);
        }
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
      await addEvent({
        agent: selectedAgent,
        type: "manual",
        message: newMessage,
      });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddEvent();
    }
  };

  const getConciseEventMessage = (event: (typeof events)[number]) => {
    const source = event.metadata?.source;

    if (source === "openclaw-subagent-bridge") {
      const taskResult = typeof event.metadata?.result === "string" ? event.metadata.result : "";
      const normalizedResult = taskResult.replace(/\s+/g, " ").trim();
      const [firstSentence] = normalizedResult.split(/(?<=[.!?])\s+/);
      const concise = firstSentence && firstSentence.length > 0 ? firstSentence : event.message;

      return concise.length > 120 ? `${concise.slice(0, 117)}...` : concise;
    }

    return event.message;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };


  // Filter events by type
  const filteredEvents =
    filterType === "all"
      ? events
      : events.filter((e) => e.type === filterType);

  // Group filtered events by agent
  const eventsByAgent = filteredEvents.reduce(
    (acc, event) => {
      if (!acc[event.agent]) {
        acc[event.agent] = [];
      }
      acc[event.agent].push(event);
      return acc;
    },
    {} as Record<string, typeof events>
  );

  // Get unique event types with counts
  const eventTypes = events.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Sort event types with priority order
  const typePriority = ["task", "system", "notification", "manual"];
  const sortedEventTypes = Object.keys(eventTypes).sort((a, b) => {
    const indexA = typePriority.indexOf(a);
    const indexB = typePriority.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Sort agents by agentsList order (using filtered events)
  const sortedAgents = agentsList
    .map((a) => a.name)
    .filter((name) => filteredEvents.some((e) => e.agent === name));

  return (
    <div className="border border-border rounded-[24px] p-4 bg-[#0f0f0f] min-h-[720px] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent-magenta" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Agent Activity Stream
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-gray-500">
              {filteredEvents.length} events • {sortedAgents.length} active
            </div>
            {events.length > 0 && (
              <button
                onClick={deleteAllEvents}
                className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-500 hover:text-red-400"
                title="Clear all events"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-mono uppercase transition-all ${
              filterType === "all"
                ? "bg-accent-cyan/10 text-accent-cyan border-b-2 border-accent-cyan"
                : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
            }`}
          >
            All <span className="opacity-60">({events.length})</span>
          </button>
          {sortedEventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-mono uppercase transition-all ${
                filterType === type
                  ? "bg-accent-cyan/10 text-accent-cyan border-b-2 border-accent-cyan"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
              }`}
            >
              {type} <span className="opacity-60">({eventTypes[type]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Vertical Swimlanes - Grid 3 Columns with auto-fit rows */}
      <div className="flex-1 overflow-y-auto mb-4 grid grid-cols-1 gap-4 pr-2 2xl:grid-cols-3 xl:grid-cols-2" style={{ gridAutoRows: "min-content" }}>
        {loading && events.length === 0 && (
          <div className="flex items-center justify-center w-full text-gray-500">
            <RefreshCw size={24} className="animate-spin" />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="flex items-center justify-center w-full text-gray-500 text-sm">
            No events yet. Add one below or wait for agents to report.
          </div>
        )}

        {!loading && events.length > 0 && filteredEvents.length === 0 && (
          <div className="flex items-center justify-center w-full text-gray-500 text-sm">
            No events match the selected filter.
          </div>
        )}

        {/* Display as vertical columns (each agent = one column) - show all agents */}
        {agentsList.map((agent) => {
          const agentEvents = eventsByAgent[agent.name] || [];
          const hasEvents = agentEvents.length > 0;
          const AgentIcon = ICON_MAP[agent.icon] || Activity;

          return (
            <div
              key={agent.id}
              className={`border border-border rounded-lg overflow-hidden flex flex-col bg-[#1a1a1a] transition-all h-fit ${
                !hasEvents ? "opacity-40" : ""
              }`}
            >
              {/* Agent Header */}
              <div
                className="p-3 text-white font-semibold uppercase tracking-wide text-sm flex items-center justify-between border-b border-border"
                style={{ background: agent.color + "15" }}
              >
                <div className="flex items-center gap-2">
                  <AgentIcon size={16} style={{ color: agent.color }} />
                  <span style={{ color: agent.color }}>{agent.name}</span>
                </div>
                <div
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: agent.color + "22",
                    color: agent.color,
                  }}
                >
                  {agent.role}
                </div>
              </div>

              {/* Agent Info */}
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-border">
                {agent.description}
              </div>

              {/* Status */}
              <div className="px-3 py-2 text-xs flex items-center gap-2 border-b border-border">
                <div
                  className={`w-2 h-2 rounded-full ${
                    agent.status === "active"
                      ? "bg-green-500"
                      : agent.status === "standby"
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                  }`}
                />
                <span className="text-gray-500">
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </div>

              {/* Events - Dynamic height, max 5 visible */}
              <div 
                className="overflow-y-auto space-y-1 p-2" 
                style={{ 
                  ...(agentEvents.length === 0 && { minHeight: "60px" }),
                  ...(agentEvents.length > 5 && { maxHeight: "400px" })
                }}
              >
                {agentEvents.length === 0 ? (
                  <div className="text-xs text-gray-600 py-4 text-center">
                    No events
                  </div>
                ) : (
                  agentEvents.slice(0, 20).map((event) => {
                    const isTask = event.type === "task";
                    const isNotification = event.type === "notification";
                    
                    // Task status
                    const taskStatus = event.metadata?.status || "completed";
                    const taskColor = TASK_STATUS_COLORS[taskStatus];
                    const taskLabel = TASK_STATUS_LABELS[taskStatus];
                    
                    // Notification severity
                    const notifSeverity = event.metadata?.severity || "normal";
                    const notifColor = NOTIFICATION_SEVERITY_COLORS[notifSeverity];
                    const notifLabel = NOTIFICATION_SEVERITY_LABELS[notifSeverity];
                    const commit = event.metadata?.commit;
                    const area = event.metadata?.area;
                    
                    // Border color
                    const borderColor = isTask ? taskColor : isNotification ? notifColor : undefined;
                    const statusColor = isTask ? taskColor : isNotification ? notifColor : undefined;
                    const statusLabel = isTask ? taskLabel : isNotification ? notifLabel : undefined;

                    return (
                      <div
                        key={event.id}
                        className="text-xs p-2 bg-[#111] rounded hover:bg-[#222] transition-colors border border-border/30 relative"
                        style={
                          borderColor
                            ? { borderLeftWidth: "3px", borderLeftColor: borderColor }
                            : {}
                        }
                      >
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-500 font-mono">
                            {formatTime(event.timestamp)}
                          </span>
                          <div className="flex items-center gap-1">
                            {(isTask || isNotification) && statusLabel && (
                              <span
                                className="px-1.5 py-0.5 rounded text-xs font-medium"
                                style={{
                                  background: statusColor + "22",
                                  color: statusColor,
                                }}
                                title={statusLabel}
                              >
                                {statusLabel}
                              </span>
                            )}
                            <span
                              className="px-1.5 py-0.5 rounded text-xs"
                              style={{
                                background: agent.color + "22",
                                color: agent.color,
                              }}
                            >
                              {event.type}
                            </span>
                            {commit && (
                              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-accent-amber bg-accent-amber/10">
                                <GitCommitHorizontal size={10} />
                                {String(commit).slice(0, 7)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-300 break-words">
                          {getConciseEventMessage(event)}
                        </p>
                        {area && (
                          <div className="mt-2 text-[11px] font-mono uppercase tracking-wide text-gray-500">
                            Area: {area}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {agentEvents.length > 20 && (
                  <div className="text-xs text-gray-500 pl-2 pt-1 text-center">
                    +{agentEvents.length - 20} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-[#1a1a1a] border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-cyan transition-colors"
          >
            {agentsList.map((agent) => (
              <option key={agent.id} value={agent.name}>
                {agent.name} - {agent.role}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Log event as agent... (Press Enter)"
            disabled={isAdding}
            className="flex-1 bg-[#1a1a1a] border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-magenta transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleAddEvent}
            disabled={isAdding || !newMessage.trim()}
            className="px-4 py-2 bg-accent-magenta hover:bg-accent-magenta/80 text-background font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
