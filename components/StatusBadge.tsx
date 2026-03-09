"use client";

import clsx from "clsx";

import type { ExpenseBudgetStatus } from "@/types/expenses";

const statusConfig: Record<ExpenseBudgetStatus, { emoji: string; label: string; textClass: string; badgeClass: string }> = {
  normal: {
    emoji: "🟢",
    label: "Normal",
    textClass: "text-green-300",
    badgeClass: "bg-green-500/10 border-green-500/30",
  },
  alert: {
    emoji: "🟡",
    label: "Alert",
    textClass: "text-yellow-200",
    badgeClass: "bg-yellow-500/10 border-yellow-500/30",
  },
  restrict: {
    emoji: "🟠",
    label: "Restrict",
    textClass: "text-orange-200",
    badgeClass: "bg-orange-500/10 border-orange-500/30",
  },
  over: {
    emoji: "🔴",
    label: "Over",
    textClass: "text-red-200",
    badgeClass: "bg-red-500/10 border-red-500/30",
  },
};

export type StatusBadgeProps = {
  status?: ExpenseBudgetStatus | string | null;
  className?: string;
};

export default function StatusBadge({ status = "normal", className }: StatusBadgeProps) {
  const normalizedStatus = (status?.toLowerCase?.() as ExpenseBudgetStatus) ?? "normal";
  const config = statusConfig[normalizedStatus] ?? statusConfig.normal;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
        "border-white/10 bg-white/5 text-white/80",
        config.badgeClass,
        className,
      )}
    >
      <span className="text-base leading-none">{config.emoji}</span>
      <span className={clsx("leading-none", config.textClass)}>{config.label}</span>
    </span>
  );
}

export { statusConfig };
