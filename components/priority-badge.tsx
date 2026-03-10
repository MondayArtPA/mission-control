"use client";

import type { PriorityLevel } from "@/types/task";
import { PRIORITY_META } from "@/types/task";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: "sm" | "md";
}

export default function PriorityBadge({ priority, size = "md" }: PriorityBadgeProps) {
  const meta = PRIORITY_META[priority];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide ${meta.bg} ${meta.color} ${padding}`}
    >
      <span className="text-[10px]">●</span>
      {meta.label}
    </span>
  );
}
