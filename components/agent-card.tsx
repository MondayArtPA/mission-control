"use client";

import type { AgentOverview } from "@/types/task";

interface AgentCardProps {
  agent: AgentOverview;
  onSelect?: (agentId: AgentOverview["id"]) => void;
  isSelected?: boolean;
}

export default function AgentCard({ agent, onSelect, isSelected }: AgentCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(agent.id)}
      className={`rounded-3xl border px-4 py-4 text-left transition hover:border-accent-cyan/40 hover:bg-[#0f1723] ${
        isSelected ? "border-accent-cyan/40 bg-[#0f1723]" : "border-border/70 bg-[#0c1017]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-gray-500">{agent.label}</div>
          <div className="mt-1 text-2xl">{agent.icon}</div>
        </div>
        <div className="text-sm font-semibold text-gray-300">
          {agent.statusEmoji} {agent.status === "idle" ? "Idle" : agent.status === "busy" ? "Busy" : "Active"}
        </div>
      </div>
      <p className="mt-3 text-sm text-white">{agent.currentTask}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-gray-400">
        <span>คิว {agent.queueCount}</span>
        <span>Model {agent.model}</span>
        <span>Session {agent.sessionTime}</span>
      </div>
    </button>
  );
}
