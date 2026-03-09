"use client";

import { useMemo } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseBudgetStatus, ExpenseTrendPoint } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const LONG_DATE = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "full",
});

const STATUS_STYLES: Record<ExpenseBudgetStatus, {
  label: string;
  description: string;
  badgeClass: string;
  textClass: string;
}> = {
  normal: {
    label: "Normal",
    description: "Spend is comfortably below budget.",
    badgeClass: "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300",
    textClass: "text-emerald-300",
  },
  alert: {
    label: "Alert",
    description: "Crossed ฿1,200 alert threshold.",
    badgeClass: "bg-yellow-500/10 border border-yellow-400/40 text-yellow-200",
    textClass: "text-yellow-200",
  },
  restrict: {
    label: "Restrict",
    description: "Restrictive controls in effect (≥ ฿1,395).",
    badgeClass: "bg-orange-500/10 border border-orange-400/40 text-orange-200",
    textClass: "text-orange-200",
  },
  over: {
    label: "Over",
    description: "Budget ceiling exceeded (≥ ฿1,500).",
    badgeClass: "bg-red-500/10 border border-red-500/40 text-red-200",
    textClass: "text-red-200",
  },
};

interface ChartDatum extends ExpenseTrendPoint {
  label: string;
}

function toChartData(points: ExpenseTrendPoint[] = []): ChartDatum[] {
  return points.map((point) => ({
    ...point,
    label: SHORT_DATE.format(new Date(`${point.date}T00:00:00`)),
  }));
}

function formatCurrency(value: number | undefined | null) {
  return THB.format(value ?? 0);
}

function formatMonthLabel(value?: string) {
  if (!value) return "—";
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

const TrendTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0]?.payload as ChartDatum | undefined;
  if (!datum) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-[#050505]/95 px-3 py-2 shadow-xl">
      <div className="text-[11px] font-mono uppercase text-gray-500">
        {LONG_DATE.format(new Date(`${datum.date}T00:00:00`))}
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Daily</span>
          <span className="font-semibold text-accent-cyan">{formatCurrency(datum.total)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Cumulative</span>
          <span className="font-semibold text-accent-magenta">{formatCurrency(datum.cumulative)}</span>
        </div>
      </div>
    </div>
  );
};

export default function ExpenseGraph() {
  const { summary, month, setMonth, loading, error, refreshExpenses } = useExpenses();
  const metrics = summary?.metrics;

  const alertThreshold = metrics?.totals.alertThreshold ?? 1200;
  const restrictThreshold = metrics?.totals.restrictThreshold ?? 1395;

  const trendPoints = metrics?.trend.daily ?? [];
  const chartData = useMemo(() => toChartData(trendPoints), [trendPoints]);
  const status: ExpenseBudgetStatus = metrics?.totals.status ?? "normal";
  const statusMeta = STATUS_STYLES[status];

  return (
    <section className="rounded-2xl border border-border bg-[#0d0d0d] p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-gray-500">Expense Controls</p>
          <h2 className="text-lg font-semibold text-foreground">Daily Expense Trend</h2>
          <p className="text-sm text-gray-500">{`Monitoring ${formatMonthLabel(summary?.month ?? month)} spend progression.`}</p>
        </div>
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-gray-400">
            <CalendarDays size={14} className="text-accent-cyan" />
            <span>Month:</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded border border-border bg-[#111] px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-foreground focus:border-accent-cyan focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={refreshExpenses}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1 rounded border border-border bg-[#111] px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-gray-300 transition hover:border-accent-cyan disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : "text-accent-cyan"} />
            refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-border bg-[#121212] p-4 lg:col-span-4">
          <p className="text-[11px] font-mono uppercase tracking-wide text-gray-500">Month-to-date</p>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(metrics?.totals.spent)}
          </div>
          <p className={`mt-1 text-xs ${statusMeta.textClass}`}>{statusMeta.description}</p>

          <div className="mt-4 space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between text-gray-400">
              <span>Remaining</span>
              <span className="text-foreground">{formatCurrency(metrics?.totals.remaining)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Budget</span>
              <span>{formatCurrency(metrics?.totals.budget)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Usage</span>
              <span>{metrics?.totals.usagePct?.toFixed(1) ?? "0.0"}%</span>
            </div>
          </div>

          <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            <span>{statusMeta.label} status</span>
          </div>

          <div className="mt-4 space-y-1 text-[11px] text-gray-500">
            <div>Alert line: {formatCurrency(alertThreshold)}</div>
            <div>Restrict line: {formatCurrency(restrictThreshold)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-[#121212] p-4 lg:col-span-8">
          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!error && (
            <div className="h-80">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Loading expense trend…
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  No spend data for this month yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#666" tickLine={false} fontSize={12} />
                    <YAxis
                      stroke="#666"
                      tickLine={false}
                      tickFormatter={(value) => `${Math.round(Number(value))}`}
                      fontSize={12}
                    />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#2a2a2a" }} />
                    <Legend wrapperStyle={{ color: "#999", fontSize: 12 }} />
                    <ReferenceLine
                      y={alertThreshold}
                      stroke="#facc15"
                      strokeDasharray="4 4"
                      label={{ value: `Alert ${formatCurrency(alertThreshold)}`, fill: "#facc15", position: "right", fontSize: 11 }}
                    />
                    <ReferenceLine
                      y={restrictThreshold}
                      stroke="#fb923c"
                      strokeDasharray="4 4"
                      label={{ value: `Restrict ${formatCurrency(restrictThreshold)}`, fill: "#fb923c", position: "right", fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Daily"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative"
                      stroke="#f472b6"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
