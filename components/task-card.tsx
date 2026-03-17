"use client";

import { useMemo, useState } from "react";
import type { TaskRecord } from "@/types/task";
import PriorityBadge from "@/components/priority-badge";

type TaskCardVariant = "inProgress" | "queued" | "completed" | "pendingReview" | "blocked";

interface TaskCardProps {
  task: TaskRecord;
  variant?: TaskCardVariant;
  showActions?: boolean;
  onPromote?: (task: TaskRecord) => void;
  onReassign?: (task: TaskRecord) => void;
  onCancel?: (task: TaskRecord) => void;
}

const VARIANT_META: Record<
  TaskCardVariant,
  { label: string; tone: string; border: string; accent: string }
> = {
  inProgress: {
    label: "IN PROGRESS",
    tone: "text-accent-cyan",
    border: "border-accent-cyan/40",
    accent: "bg-accent-cyan/10",
  },
  queued: {
    label: "IN QUEUE",
    tone: "text-amber-300",
    border: "border-amber-500/40",
    accent: "bg-amber-500/10",
  },
  pendingReview: {
    label: "PENDING REVIEW",
    tone: "text-emerald-200",
    border: "border-emerald-500/40",
    accent: "bg-emerald-500/10",
  },
  blocked: {
    label: "BLOCKED",
    tone: "text-red-200",
    border: "border-red-500/50",
    accent: "bg-red-500/10",
  },
  completed: {
    label: "DONE",
    tone: "text-accent-purple",
    border: "border-accent-purple/40",
    accent: "bg-accent-purple/10",
  },
};

function formatClock(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start) return null;
  const startedAt = new Date(start).getTime();
  const endedAt = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt < startedAt) return null;
  const diffMinutes = Math.round((endedAt - startedAt) / 60000);
  if (diffMinutes < 1) return "< 1m";
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatRelative(value?: string | null) {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMinutes = Math.floor((Date.now() - ts) / 60000);
  if (diffMinutes < 1) return "เมื่อสักครู่";
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันก่อน`;
}

function formatTokens(task: TaskRecord) {
  const total = task.tokenUsage?.total;
  if (!total || Number.isNaN(total)) return null;
  if (total >= 1000) {
    return `${(total / 1000).toFixed(1)}K tokens`;
  }
  return `${total.toLocaleString()} tokens`;
}

function dispatchLabel(task: TaskRecord) {
  if (task.dispatchError) {
    return { label: "⚠️ Dispatch failed", tone: "text-red-300", border: "border-red-500/50" };
  }
  if (task.dispatched) {
    const timeLabel = task.dispatchedAt ? ` ${formatClock(task.dispatchedAt)}` : "";
    return { label: `📤 Sent${timeLabel}`, tone: "text-emerald-200", border: "border-emerald-500/40" };
  }
  if (task.status === "queued" || task.status === "new") {
    return { label: "⌛ Waiting dispatch", tone: "text-amber-200", border: "border-amber-500/40" };
  }
  return null;
}

export default function TaskCard({
  task,
  variant = "queued",
  showActions,
  onPromote,
  onReassign,
  onCancel,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = VARIANT_META[variant];
  const duration = useMemo(() => formatDuration(task.startedAt, task.completedAt), [task.startedAt, task.completedAt]);
  const timelineText = useMemo(() => {
    switch (variant) {
      case "inProgress":
        return task.startedAt ? `เริ่ม ${formatClock(task.startedAt)}${duration ? ` (${duration})` : ""}` : `สร้าง ${formatClock(task.createdAt)}`;
      case "pendingReview":
        return `อัปเดต ${formatRelative(task.updatedAt)}`;
      case "blocked":
        return `แจ้งล่าสุด ${formatRelative(task.updatedAt)}`;
      case "completed":
        return `${formatClock(task.completedAt)}${duration ? ` · ${duration}` : ""}`;
      default:
        return `สร้าง ${formatClock(task.createdAt)}`;
    }
  }, [variant, task.startedAt, task.completedAt, task.createdAt, task.updatedAt, duration]);

  const tokenLabel = formatTokens(task);
  const costLabel = task.estimatedCostThb !== null && task.estimatedCostThb !== undefined ? `฿${task.estimatedCostThb.toFixed(2)}` : null;
  const dispatchState = variant === "queued" ? dispatchLabel(task) : null;

  return (
    <div className="rounded-3xl border border-border/70 bg-[#0b1018] p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} size="sm" />
        <span className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${meta.tone}`}>{meta.label}</span>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-base font-semibold text-white">{task.title}</p>
        <p className="text-[12px] text-gray-400" suppressHydrationWarning>{timelineText}</p>
      </div>

      {variant === "completed" && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-300">
          {task.modelUsed && <span>🤖 {task.modelUsed}</span>}
          {tokenLabel && <span>🔤 {tokenLabel}</span>}
          {costLabel && <span>💰 {costLabel}</span>}
        </div>
      )}

      {dispatchState && (
        <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] ${dispatchState.tone} ${dispatchState.border}`}>
          {dispatchState.label}
        </div>
      )}

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

      {(task.description || task.resultSummary) && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-[11px] uppercase tracking-[0.3em] text-accent-cyan"
          >
            {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
          </button>
          {expanded && (
            <div className="mt-3 space-y-2 text-[13px] text-gray-300">
              {task.description && (
                <p className="leading-relaxed text-gray-300">
                  <span className="text-gray-500">Brief: </span>
                  {task.description}
                </p>
              )}
              {task.resultSummary && (
                <p className="leading-relaxed text-gray-200">
                  <span className="text-gray-500">Result: </span>
                  {task.resultSummary}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
