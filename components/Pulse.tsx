"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMissionStatus } from "@/hooks/useStatus";
import type { ExpenseBudgetStatus } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const PROGRESS_GRADIENT: Record<ExpenseBudgetStatus, string> = {
  normal: "from-emerald-400 to-emerald-500",
  alert: "from-amber-400 to-amber-500",
  restrict: "from-orange-500 to-orange-600",
  over: "from-red-500 to-red-600",
};

const BADGE_STYLES: Record<"emerald" | "amber" | "orange" | "red", { text: string; pill: string; dot: string }> = {
  emerald: {
    text: "text-emerald-300",
    pill: "border-emerald-500/40 bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
  amber: {
    text: "text-amber-200",
    pill: "border-amber-400/50 bg-amber-400/10",
    dot: "bg-amber-300",
  },
  orange: {
    text: "text-orange-200",
    pill: "border-orange-500/50 bg-orange-500/10",
    dot: "bg-orange-400",
  },
  red: {
    text: "text-red-200",
    pill: "border-red-500/50 bg-red-500/10",
    dot: "bg-red-400",
  },
};

type DateFormatter = (date: Date) => string;

const formatDate: DateFormatter = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime: DateFormatter = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

export default function Pulse() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { status: missionStatus, loading: statusLoading, error: statusError, refresh } = useMissionStatus();
  const expenseStatus = missionStatus?.expenses;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const badge = expenseStatus?.badge;
  const badgeStyle = badge ? BADGE_STYLES[badge.palette] : BADGE_STYLES.emerald;
  const statusKey: ExpenseBudgetStatus = expenseStatus?.status ?? "normal";
  const usagePct = expenseStatus?.usagePct ?? 0;
  const usageWidth = `${Math.min(usagePct, 100)}%`;

  return (
    <div className="border border-border/80 rounded-[28px] p-6 sm:p-8 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] shadow-[0_0_40px_rgba(0,255,255,0.04)]">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-wide">
              {formatDate(currentTime)}
            </div>
            <div className="text-4xl font-bold font-mono tracking-tight bg-gradient-to-r from-accent-cyan to-accent-magenta bg-clip-text text-transparent sm:text-5xl xl:text-6xl">
              {formatTime(currentTime)}
            </div>
          </div>

          <div className="hidden h-20 w-px bg-gradient-to-b from-transparent via-border to-transparent lg:block" />

          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              <span className="bg-gradient-to-r from-accent-cyan via-accent-magenta to-accent-cyan bg-clip-text text-transparent">
                Artistuta
              </span>
            </h1>
            <div className="text-sm text-gray-400 font-medium tracking-wide uppercase">
              Mission Control
            </div>
          </div>
        </div>

        <div className="flex-1 px-0 text-left xl:px-8 xl:text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-1 h-1 rounded-full bg-accent-amber animate-pulse" />
            <div className="text-xs text-accent-amber font-semibold uppercase tracking-widest">
              North Star
            </div>
            <div className="w-1 h-1 rounded-full bg-accent-amber animate-pulse" />
          </div>
          <div className="text-xl font-medium text-gray-200 italic leading-relaxed">
            "Build systems that scale, not just tasks."
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
          <div className="w-full rounded-2xl border border-border/80 bg-[#0d1117] p-4 sm:w-80">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wide text-gray-500">
              <span>Expense guardrail</span>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-foreground transition"
                title="Refresh status"
              >
                <RefreshCw size={12} className={statusLoading ? "animate-spin" : undefined} />
                sync
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold font-mono text-white">
                  {expenseStatus ? THB.format(expenseStatus.spent) : "—"}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  of {expenseStatus ? THB.format(expenseStatus.budget) : "—"}
                </div>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle.pill}`}>
                <span className={`h-2 w-2 rounded-full ${badgeStyle.dot}`} />
                <span className={badgeStyle.text}>{badge ? `${badge.emoji} ${badge.label}` : "🟢 Normal"}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>Usage</span>
                <span>{usagePct.toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${PROGRESS_GRADIENT[statusKey]}`} style={{ width: usageWidth }} />
              </div>
            </div>

            <div className="mt-3 text-[11px] text-gray-400">
              {badge?.message ?? "Spend is comfortably under control."}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
              <div>
                <div className="text-gray-500 uppercase">Remaining</div>
                <div className="text-sm text-foreground">{expenseStatus ? THB.format(expenseStatus.remaining) : "—"}</div>
              </div>
              <div>
                <div className="text-gray-500 uppercase">Alert line</div>
                <div>{expenseStatus ? THB.format(expenseStatus.thresholds.alert) : "—"}</div>
              </div>
            </div>

            {statusError && (
              <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-200">
                {statusError}
              </div>
            )}
          </div>

          <Link
            href="/expenses"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan transition hover:border-accent-cyan hover:bg-accent-cyan/20"
          >
            Open expense dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
