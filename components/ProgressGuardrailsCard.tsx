"use client";

import { useMemo } from "react";

import StatusBadge from "@/components/StatusBadge";
import {
  CartesianGrid,
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

import type { ExpenseSummaryApiPayload, ExpenseBudgetStatus } from "@/types/expenses";

const USD_EXCHANGE_RATE = 33;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_START_YEAR = 2026;
const MONTH_END_YEAR = 2030;

const formatTHB = (value: number) =>
  `฿${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DAY_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

interface ProgressGuardrailsCardProps {
  summary: ExpenseSummaryApiPayload | null;
  loading: boolean;
  month: string;
  setMonth: (value: string) => void;
}

interface ChartPoint {
  day: number;
  date: string;
  label: string;
  actual: number | null;
  accumulated: number | null;
  projected: number | null;
}

interface ProjectionPoint {
  day: number;
  value: number;
}

interface ProjectionResult {
  valuesByDay: Map<number, number>;
  projectedEom: number;
  lastActualDay: number;
}

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as ChartPoint | undefined;
  if (!data) return null;

  const dateLabel = DAY_LABEL.format(new Date(`${data.date}T00:00:00`));

  return (
    <div className="rounded-lg border border-border bg-[#050505]/95 px-3 py-2 shadow-xl">
      <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500">{dateLabel}</div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Daily Actual</span>
          <span className="font-semibold text-sky-300">
            {data.actual !== null ? formatTHB(data.actual) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Accumulated</span>
          <span className="font-semibold text-emerald-300">
            {data.accumulated !== null ? formatTHB(data.accumulated) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Projected</span>
          <span className="font-semibold text-purple-300">
            {data.projected !== null ? formatTHB(data.projected) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ProgressGuardrailsCard({ summary, loading, month, setMonth }: ProgressGuardrailsCardProps) {
  const budget = summary?.metrics?.totals?.budget ?? 1500;
  const alertLine = summary?.metrics?.totals?.alertThreshold ?? 1200;
  const restrictLine = summary?.metrics?.totals?.restrictThreshold ?? 1395;

  const { chartData, projectedEom, axisMax } = useMemo(() => buildChartData(summary), [summary]);
  const guardrailStatus = resolveStatus(projectedEom, alertLine, restrictLine, budget);
  const effectiveMonth = month || summary?.month || getCurrentMonth();
  const monthSelectOptions = useMemo(() => buildMonthOptions(effectiveMonth), [effectiveMonth]);
  const projectedUsd = projectedEom / USD_EXCHANGE_RATE;
  const remaining = Math.max(budget - projectedEom, 0);
  const remainingUsd = remaining / USD_EXCHANGE_RATE;
  const projectionPct = budget > 0 ? (projectedEom / budget) * 100 : 0;

  const yAxisMax = Math.max(axisMax, budget, alertLine, restrictLine) * 1.05 || budget * 1.1;
  const showSkeleton = loading && !summary;

  return (
    <section className="rounded-2xl border border-border bg-[#0f0f0f] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Progress vs Budget Guardrails</h3>
          {!showSkeleton && <StatusBadge status={guardrailStatus} />}
        </div>
        <select
          value={effectiveMonth}
          onChange={(event) => setMonth(event.target.value)}
          className="min-w-[5.5rem] bg-[#1a1a1a] border border-border rounded px-3 py-1.5 text-xs font-mono text-white hover:border-accent-green focus:border-accent-green focus:outline-none cursor-pointer transition"
        >
          {monthSelectOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#0f0f0f] text-white">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showSkeleton ? (
        <>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-[#1a1a1a]" />
          <div className="h-4 w-24 mt-1 animate-pulse rounded bg-[#1a1a1a]" />
          <div className="h-4 w-48 mt-2 animate-pulse rounded bg-[#1a1a1a]" />
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-semibold text-white">{formatTHB(projectedEom)}</div>
            <span className="text-[10px] text-gray-500">Projected EOM</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">({formatUSD(projectedUsd)})</div>
          <div className="text-[10px] text-gray-500 mt-2">
            Projection: {projectionPct.toFixed(1)}% of budget
          </div>
        </>
      )}

      <div className="mt-6 h-52">
        {showSkeleton ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-[#131313]" />
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No trend data available for this month.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 6 }}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                stroke="#666"
                fontSize={11}
                dy={6}
                minTickGap={12}
              />
              <YAxis
                stroke="#666"
                tickLine={false}
                fontSize={11}
                width={48}
                domain={[0, yAxisMax]}
                tickFormatter={(value) => `${Math.round(Number(value))}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2a2a2a" }} />
              <ReferenceLine
                y={alertLine}
                stroke="#facc15"
                strokeDasharray="4 4"
                label={{ value: "Alt", fill: "#facc15", position: "right", fontSize: 9 }}
              />
              <ReferenceLine
                y={restrictLine}
                stroke="#fb923c"
                strokeDasharray="4 4"
                label={{ value: "Rst", fill: "#fb923c", position: "right", fontSize: 9 }}
              />
              <ReferenceLine
                y={budget}
                stroke="#f87171"
                strokeDasharray="2 6"
                label={{ value: "Bdgt", fill: "#f87171", position: "right", fontSize: 9 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Daily Actual"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, stroke: "#0f0f0f", strokeWidth: 1 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="accumulated"
                name="Accumulated"
                stroke="#34d399"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-gray-500">
        <LegendSwatch color="bg-sky-400" label="Daily Actual" />
        <LegendSwatch color="bg-emerald-400" label="Accumulated" />
        <LegendSwatch color="bg-purple-400" label="Projected" dashed />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  primary,
  secondary,
  loading,
}: {
  label: string;
  primary: string;
  secondary: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-[#111] p-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      {loading ? (
        <>
          <div className="mt-2 h-6 w-28 animate-pulse rounded bg-[#1c1c1c]" />
          <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#1c1c1c]" />
        </>
      ) : (
        <>
          <div className="mt-1 text-lg font-semibold text-white">{primary}</div>
          <div className="text-xs text-gray-500">({secondary})</div>
        </>
      )}
    </div>
  );
}

function LegendSwatch({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <span className="w-6" style={{ borderTop: "2px dashed rgba(167, 139, 250, 0.8)" }} />
      ) : (
        <span className={`h-1.5 w-6 rounded-full ${color}`} />
      )}
      <span>{label}</span>
    </div>
  );
}

function buildChartData(summary: ExpenseSummaryApiPayload | null) {
  if (!summary) {
    return { chartData: [] as ChartPoint[], projectedEom: 0, axisMax: 0 };
  }

  const [yearStr, monthStr] = summary.month?.split("-") ?? [];
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { chartData: [] as ChartPoint[], projectedEom: summary.metrics?.totals?.spent ?? 0, axisMax: summary.metrics?.totals?.spent ?? 0 };
  }

  const totalDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = summary.isMonthToDate && today.getFullYear() === year && today.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth ? Math.min(today.getDate(), totalDays) : totalDays;

  const totalsMap = new Map(summary.metrics?.trend?.daily?.map((point) => [point.date, point.total]) ?? []);
  const chartPoints: ChartPoint[] = [];
  let cumulative = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
    const withinObservedWindow = day <= daysElapsed;
    let actualValue: number | null = null;
    if (withinObservedWindow) {
      actualValue = roundCurrency(totalsMap.get(date) ?? 0);
      cumulative = roundCurrency(cumulative + actualValue);
    }

    chartPoints.push({
      day,
      date,
      label: day.toString(),
      actual: actualValue,
      accumulated: actualValue !== null ? cumulative : null,
      projected: null,
    });
  }

  const actualPoints: ProjectionPoint[] = chartPoints
    .filter((point) => point.accumulated !== null)
    .map((point) => ({ day: point.day, value: point.accumulated as number }));

  const projection = buildProjection(actualPoints, totalDays);

  const chartData = chartPoints.map((point) => {
    let projectedValue: number | null = null;
    if (projection.lastActualDay > 0 && point.day >= projection.lastActualDay) {
      projectedValue = projection.valuesByDay.get(point.day) ?? null;
    }
    return {
      ...point,
      projected: projectedValue,
    };
  });

  const axisMax = chartData.reduce((max, point) => {
    return Math.max(max, point.accumulated ?? 0, point.projected ?? 0, point.actual ?? 0);
  }, 0);

  return {
    chartData,
    projectedEom: projection.projectedEom,
    axisMax,
  };
}

function buildProjection(points: ProjectionPoint[], totalDays: number): ProjectionResult {
  if (points.length === 0) {
    return { valuesByDay: new Map(), projectedEom: 0, lastActualDay: 0 };
  }

  const lastPoint = points[points.length - 1];

  let slope = 0;
  let intercept = 0;

  if (points.length === 1) {
    const safeDay = Math.max(lastPoint.day, 1);
    slope = safeDay > 0 ? lastPoint.value / safeDay : 0;
    intercept = 0;
  } else {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.day, 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p) => sum + p.day * p.value, 0);
    const sumXX = points.reduce((sum, p) => sum + p.day * p.day, 0);
    const denominator = n * sumXX - sumX * sumX;

    if (denominator === 0) {
      slope = lastPoint.value / Math.max(lastPoint.day, 1);
      intercept = 0;
    } else {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
    }
  }

  if (!Number.isFinite(slope)) {
    slope = 0;
  }
  slope = Math.max(0, slope);

  if (!Number.isFinite(intercept)) {
    intercept = 0;
  }

  const valuesByDay = new Map<number, number>();
  let previous = lastPoint.value;

  for (let day = lastPoint.day; day <= totalDays; day++) {
    let projectedValue = day === lastPoint.day ? lastPoint.value : intercept + slope * day;
    if (!Number.isFinite(projectedValue)) {
      projectedValue = previous;
    }
    projectedValue = Math.max(projectedValue, previous);
    projectedValue = roundCurrency(projectedValue);
    valuesByDay.set(day, projectedValue);
    previous = projectedValue;
  }

  return {
    valuesByDay,
    projectedEom: valuesByDay.get(totalDays) ?? lastPoint.value,
    lastActualDay: lastPoint.day,
  };
}

function resolveStatus(value: number, alertLine: number, restrictLine: number, budget: number): string {
  if (value <= alertLine) {
    return "normal";
  }

  if (value <= restrictLine) {
    return "alert";
  }

  if (value <= budget) {
    return "restrict";
  }

  return "over";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildMonthOptions(currentValue: string) {
  const options = [];
  for (let year = MONTH_START_YEAR; year <= MONTH_END_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      const value = `${year}-${String(month).padStart(2, "0")}`;
      options.push({ value, label: `${MONTH_LABELS[month - 1]} ${year}` });
    }
  }
  return options;
}
