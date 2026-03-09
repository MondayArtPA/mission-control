"use client";

import { useState } from "react";
import { Activity, Plus, Trash2, RefreshCw } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";

const AGENT_COLORS: Record<string, string> = {
  MONDAY: "#00ffff", // cyan
  BLUEPRINT: "#ff00ff", // magenta
  QUANT: "#00ff00", // green
  SWISS: "#ffbf00", // amber
  PIXAR: "#ff0080", // pink
  HUBBLE: "#0080ff", // blue
  MARCUS: "#8000ff", // purple
  SYSTEM: "#888888", // gray
};

// Agent display order (for swimlanes)
const AGENT_ORDER = [
  "SYSTEM",
  "MONDAY",
  "BLUEPRINT",
  "SWISS",
  "HUBBLE",
  "QUANT",
  "PIXAR",
  "MARCUS",
];

export default function FeedSection() {
  const { events, loading, error, addEvent, deleteAllEvents, agents } = useEvents();
  const [newMessage, setNewMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("SYSTEM");
  const [isAdding, setIsAdding] = useState(false);

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

  const getAgentColor = (agent: string) => {
    return AGENT_COLORS[agent] || "#888888";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Group events by agent
  const eventsByAgent = events.reduce((acc, event) => {
    if (!acc[event.agent]) {
      acc[event.agent] = [];
    }
    acc[event.agent].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  // Sort agents by defined order
  const sortedAgents = agents.sort((a, b) => {
    const indexA = AGENT_ORDER.indexOf(a);
    const indexB = AGENT_ORDER.indexOf(b);
    
    // If both in order list, sort by order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only A in list, A comes first
    if (indexA !== -1) return -1;
    
    // If only B in list, B comes first
    if (indexB !== -1) return 1;
    
    // Neither in list, sort alphabetically
    return a.localeCompare(b);
  });

  return (
    <div className="border border-border rounded-lg p-4 bg-[#0f0f0f] h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-accent-magenta" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Agent Activity Feed
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-gray-500">
            {events.length} events • {agents.length} agents
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

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Event Display - Lane-based */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {loading && events.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <RefreshCw size={24} className="animate-spin" />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No events yet. Add one below or wait for agents to report.
          </div>
        )}

        {/* Display by Agent Lane */}
        {sortedAgents.map((agent) => {
          const agentEvents = eventsByAgent[agent] || [];
          const agentColor = getAgentColor(agent);

          return (
            <div key={agent} className="border border-border rounded-lg p-3 bg-[#1a1a1a]">
              {/* Agent Header */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: agentColor, boxShadow: `0 0 8px ${agentColor}` }}
                />
                <span
                  className="text-xs font-semibold font-mono uppercase tracking-wide"
                  style={{ color: agentColor }}
                >
                  {agent}
                </span>
                <span className="text-xs text-gray-500">
                  {agentEvents.length} event{agentEvents.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Agent Events */}
              <div className="space-y-1">
                {agentEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-[#222] transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-500 mt-0.5 whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </span>
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: agentColor }}
                    />
                    <span className="text-sm flex-1">{event.message}</span>
                  </div>
                ))}
                {agentEvents.length > 5 && (
                  <div className="text-xs text-gray-500 pl-2 pt-1">
                    +{agentEvents.length - 5} more
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
            style={{ color: getAgentColor(selectedAgent) }}
          >
            <option value="SYSTEM">SYSTEM</option>
            <option value="MONDAY">MONDAY</option>
            <option value="BLUEPRINT">BLUEPRINT</option>
            <option value="QUANT">QUANT</option>
            <option value="SWISS">SWISS</option>
            <option value="PIXAR">PIXAR</option>
            <option value="HUBBLE">HUBBLE</option>
            <option value="MARCUS">MARCUS</option>
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
