"use client";

import type { TaskRecord } from "@/types/task";
import PriorityBadge from "@/components/priority-badge";

interface TaskCardProps {
  task: TaskRecord;
  showActions?: boolean;
  onPromote?: (task: TaskRecord) => void;
  onReassign?: (task: TaskRecord) => void;
  onCancel?: (task: TaskRecord) => void;
}

export default function TaskCard({ task, showActions, onPromote, onReassign, onCancel }: TaskCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-[#0f131b] p-4 shadow-[0_0_24px_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} size="sm" />
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{task.status.replace("_", " ")}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{task.title}</p>
      {task.description && <p className="mt-1 text-xs text-gray-400">{task.description}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
        <span>สร้าง {new Date(task.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
        {task.startedAt && <span>เริ่ม {new Date(task.startedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {onPromote && (
            <button
              type="button"
              onClick={() => onPromote(task)}
              className="rounded-full border border-accent-amber/40 px-3 py-1 text-accent-amber transition hover:bg-accent-amber/10"
            >
              ↑ เลื่อนคิว
            </button>
          )}
          {onReassign && (
            <button
              type="button"
              onClick={() => onReassign(task)}
              className="rounded-full border border-accent-cyan/40 px-3 py-1 text-accent-cyan transition hover:bg-accent-cyan/10"
            >
              ⇄ ย้าย agent
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={() => onCancel(task)}
              className="rounded-full border border-red-500/40 px-3 py-1 text-red-300 transition hover:bg-red-500/10"
            >
              ✕ ยกเลิก
            </button>
          )}
        </div>
      )}
    </div>
  );
}
