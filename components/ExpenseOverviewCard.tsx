"use client";

import { CalendarDays, RefreshCw } from "lucide-react";
import type { ExpenseBudgetStatus, ExpenseSummaryApiPayload } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const STATUS_META: Record<ExpenseBudgetStatus, { label: string; badge: string; dot: string }> = {
  normal: {
    label: "normal",
    badge: "bg-emerald-500/10 border border-emerald-500/40 text-emerald-200",
    dot: "bg-emerald-400",
  },
  alert: {
    label: "alert",
    badge: "bg-yellow-500/10 border border-yellow-400/40 text-yellow-100",
    dot: "bg-yellow-300",
  },
  restrict: {
    label: "restrict",
    badge: "bg-orange-500/10 border border-orange-400/40 text-orange-100",
    dot: "bg-orange-300",
  },
  over: {
    label: "over",
    badge: "bg-red-500/10 border border-red-400/40 text-red-100",
    dot: "bg-red-300",
  },
};

function formatMonthLabel(value?: string) {
  if (!value) return "—";
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface ExpenseOverviewCardProps {
  summary: ExpenseSummaryApiPayload | null;
  month: string;
  setMonth: (month: string) => void;
  refreshExpenses: () => Promise<void>;
  loading: boolean;
}

export default function ExpenseOverviewCard({
  summary,
  month,
  setMonth,
  refreshExpenses,
  loading,
}: ExpenseOverviewCardProps) {
  const totals = summary?.metrics?.totals;
  const counts = summary?.metrics?.counts;
  const spent = totals?.spent ?? summary?.totalExpense ?? 0;
  const budget = totals?.budget ?? 1500;
  const remaining = Math.max(totals?.remaining ?? budget - spent, 0);
  const usage = totals?.usagePct ?? (budget > 0 ? (spent / budget) * 100 : 0);
  const daysWithSpend = counts?.daysWithSpend ?? 0;
  const status: ExpenseBudgetStatus = totals?.status ?? "normal";
  const statusMeta = STATUS_META[status];

  return (
    <section className="rounded-2xl border border-border bg-[#0d0d0d] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.28em] text-gray-500">Overview</p>
          <h2 className="text-2xl font-semibold text-foreground">Month-to-date spend</h2>
          <p className="text-sm text-gray-500">{`Tracking ${formatMonthLabel(summary?.month ?? month)}`}</p>
        </div>
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-gray-400">
            <CalendarDays size={14} className="text-accent-cyan" />
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded border border-border bg-[#111] px-2 py-1 font-mono uppercase tracking-wide text-foreground focus:border-accent-cyan focus:outline-none"
              aria-label="Select month"
            />
          </label>
          <button
            type="button"
            onClick={refreshExpenses}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1 rounded border border-border bg-[#111] px-3 py-1 font-mono uppercase tracking-wide text-gray-300 transition hover:border-accent-cyan disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : "text-accent-cyan"} />
            refresh
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-xs font-mono uppercase tracking-wide text-gray-500">MTD spend</div>
          <div className="mt-2 text-4xl font-bold text-foreground">{THB.format(spent)}</div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>{usage.toFixed(1)}% of ฿{budget.toLocaleString()}</span>
              <span>{THB.format(remaining)} remaining</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#222]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-green via-accent-cyan to-accent-magenta"
                style={{ width: `${Math.min(usage, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-[#111111] p-4">
          <p className="text-[11px] font-mono uppercase tracking-wide text-gray-500">Days with spend</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{daysWithSpend}</p>
          <p className="text-xs text-gray-500">in {formatMonthLabel(summary?.month ?? month)}</p>
        </div>
        <div className="rounded-xl border border-border bg-[#111111] p-4">
          <p className="text-[11px] font-mono uppercase tracking-wide text-gray-500">Status</p>
          <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dot}`} />
            🟢 {statusMeta.label}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Remaining buffer: <span className="text-foreground">{THB.format(remaining)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
