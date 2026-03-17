"use client";

import type { ActivityEvent, AgentOverview } from "@/types/task";

interface ActivityFeedProps {
  events: ActivityEvent[];
  agents: AgentOverview[];
  onLoadMore?: () => void;
  loading?: boolean;
}

function resolveSourceLabel(event: ActivityEvent, agents: AgentOverview[]) {
  if (event.source === "art") {
    return "ART";
  }
  const agent = agents.find((item) => item.id === event.source);
  return agent ? agent.label : event.source.toUpperCase();
}

export default function ActivityFeed({ events, agents, onLoadMore, loading }: ActivityFeedProps) {
  return (
    <div className="rounded-3xl border border-border/70 bg-[#0d1118] p-5 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-accent-cyan">Activity Feed</div>
          <p className="text-sm text-gray-400">อัปเดตจาก agent และ bridge</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-green-300">
          ● Live
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-border/60 bg-[#0f141b] p-3">
            <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500">
              <span suppressHydrationWarning>{new Date(event.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="font-semibold text-gray-300">{resolveSourceLabel(event, agents)}</span>
            </div>
            <p className="mt-2 text-sm text-white">{event.message}</p>
            {event.priority && <p className="text-[11px] text-gray-500">Priority: {event.priority}</p>}
          </div>
        ))}
      </div>

      {onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="mt-4 w-full rounded-2xl border border-border/70 px-4 py-2 text-sm text-gray-300 hover:border-accent-cyan"
        >
          {loading ? "กำลังโหลด..." : "Load more"}
        </button>
      )}
    </div>
  );
}
