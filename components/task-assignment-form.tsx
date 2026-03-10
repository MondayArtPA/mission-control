"use client";

import { useEffect, useState } from "react";
import type { AgentOverview, AgentName, PriorityLevel } from "@/types/task";
import { PRIORITY_LEVELS, PRIORITY_META } from "@/types/task";

interface TaskAssignmentFormProps {
  agents: AgentOverview[];
  onCreated?: (taskId: string) => void;
  onRefresh?: () => void;
}

export default function TaskAssignmentForm({ agents, onCreated, onRefresh }: TaskAssignmentFormProps) {
  const [agent, setAgent] = useState<AgentName>(agents[0]?.id ?? "monday");
  const [priority, setPriority] = useState<PriorityLevel>("P2");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (agents.length > 0 && !agents.find((item) => item.id === agent)) {
      setAgent(agents[0].id);
    }
  }, [agents, agent]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setFeedback("กรุณาใส่ task ให้ครบ");
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, title, description, priority }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "ส่ง task ไม่สำเร็จ");
      }

      setTitle("");
      setDescription("");
      setFeedback(`ส่งให้ ${agent.toUpperCase()} แล้ว`);
      onCreated?.(payload.data?.id);
      onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "ส่ง task ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/70 bg-[#0b0f15] p-6 shadow-[0_0_40px_rgba(0,255,255,0.05)]">
      <div>
        <label className="text-xs uppercase tracking-[0.24em] text-gray-500">เลือก agent</label>
        <select
          value={agent}
          onChange={(event) => setAgent(event.target.value as AgentName)}
          className="mt-2 w-full rounded-2xl border border-border/70 bg-[#0f131b] px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none"
        >
          {agents.map((item) => (
            <option key={item.id} value={item.id} className="bg-[#0f131b]">
              {item.icon} {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-gray-500">Priority</div>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {PRIORITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriority(level)}
              className={`rounded-2xl border px-2 py-2 text-center text-[11px] font-semibold ${
                priority === level
                  ? `${PRIORITY_META[level].bg} ${PRIORITY_META[level].color} border-white/60`
                  : "border-border/60 text-gray-400"
              }`}
            >
              {PRIORITY_META[level].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.24em] text-gray-500">Task</label>
        <textarea
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          rows={3}
          placeholder="สรุปสิ่งที่ต้องการให้ agent ทำแบบ brief"
          className="mt-2 w-full rounded-2xl border border-border/70 bg-[#0f131b] px-3 py-3 text-sm text-white focus:border-accent-cyan focus:outline-none"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.24em] text-gray-500">รายละเอียด (ถ้ามี)</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-border/70 bg-[#0f131b] px-3 py-3 text-sm text-white focus:border-accent-cyan focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-3 text-sm font-semibold text-accent-cyan transition hover:bg-accent-cyan/20 disabled:opacity-50"
      >
        {loading ? "กำลังส่ง..." : "ส่งให้ agent"}
      </button>
      {feedback && <p className="text-sm text-gray-400">{feedback}</p>}
    </form>
  );
}
