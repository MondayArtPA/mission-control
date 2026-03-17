"use client";

import { useMemo } from "react";

import StatusBadge from "@/components/StatusBadge";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
const SYSTEM_START_DATE = new Date("2026-03-09T00:00:00Z");
const DAY_IN_MS = 86400000;

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

interface ProjectionResult {
  valuesByDay: Map<number, number>;
  projectedEom: number;
  lastActualDay: number;
}

interface OperatingWindow {
  effectiveStartDate: Date;
  operatingStartDay: number;
  totalOperatingDays: number;
  daysElapsed: number;
  observationEndDate: Date;
  monthEndDate: Date;
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
  const dailyAxisMax = useMemo(() => {
    if (!chartData.length) {
      return 1;
    }
    const peak = chartData.reduce((maxValue, point) => {
      return Math.max(maxValue, point.actual ?? 0);
    }, 0);
    return peak > 0 ? peak * 1.3 : 1;
  }, [chartData]);
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
            <ComposedChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 6 }}>
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
                yAxisId="daily"
                stroke="#4b5563"
                tickLine={false}
                fontSize={11}
                width={40}
                domain={[0, Math.max(dailyAxisMax, 1)]}
                tickFormatter={(value) => `${Math.round(Number(value))}`}
              />
              <YAxis
                yAxisId="total"
                orientation="right"
                stroke="#666"
                tickLine={false}
                fontSize={11}
                width={48}
                domain={[0, yAxisMax]}
                tickFormatter={(value) => `${Math.round(Number(value))}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2a2a2a" }} />
              <ReferenceLine
                yAxisId="total"
                y={budget}
                stroke="#f87171"
                strokeDasharray="2 6"
                label={{ value: "Monthly Budget", fill: "#f87171", position: "right", fontSize: 10 }}
              />
              <Bar
                yAxisId="daily"
                dataKey="actual"
                name="Daily Actual"
                fill="#38bdf8"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Line
                yAxisId="total"
                type="monotone"
                dataKey="accumulated"
                name="Accumulated"
                stroke="#34d399"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="total"
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </ComposedChart>
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
    const fallback = summary.metrics?.totals?.spent ?? 0;
    return { chartData: [] as ChartPoint[], projectedEom: fallback, axisMax: fallback };
  }

  const totalDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = summary.isMonthToDate && today.getFullYear() === year && today.getMonth() + 1 === month;

  const operatingWindow = computeOperatingWindow({
    year,
    month,
    totalDays,
    isCurrentMonth,
  });

  const totalsMap = new Map(summary.metrics?.trend?.daily?.map((point) => [point.date, point.total]) ?? []);
  const chartPoints: ChartPoint[] = [];
  let cumulative = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
    const currentDate = new Date(year, month - 1, day);

    const withinOperatingWindow =
      operatingWindow.totalOperatingDays > 0 &&
      currentDate >= operatingWindow.effectiveStartDate &&
      currentDate <= operatingWindow.monthEndDate;
    const withinObservedWindow =
      withinOperatingWindow &&
      currentDate <= operatingWindow.observationEndDate &&
      operatingWindow.daysElapsed > 0;

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

  const projection = buildProjection(
    chartPoints,
    operatingWindow.daysElapsed,
    operatingWindow.totalOperatingDays,
    operatingWindow.operatingStartDay,
    totalDays
  );

  const chartData = chartPoints.map((point) => ({
    ...point,
    projected: projection.valuesByDay.get(point.day) ?? null,
  }));

  const axisMax = chartData.reduce((max, point) => {
    return Math.max(max, point.accumulated ?? 0, point.projected ?? 0, point.actual ?? 0);
  }, 0);

  return {
    chartData,
    projectedEom: projection.projectedEom,
    axisMax,
  };
}

function buildProjection(
  points: ChartPoint[],
  daysElapsed: number,
  totalOperatingDays: number,
  operatingStartDay: number,
  totalDaysInMonth: number
): ProjectionResult {
  if (points.length === 0 || totalOperatingDays <= 0) {
    return { valuesByDay: new Map(), projectedEom: 0, lastActualDay: 0 };
  }

  const clampedElapsed = Math.max(Math.min(daysElapsed, totalOperatingDays), 0);
  let lastObservedPoint: ChartPoint | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]?.accumulated !== null) {
      lastObservedPoint = points[i];
      break;
    }
  }

  const mtdActual = lastObservedPoint?.accumulated ?? 0;
  const dailyAverage = clampedElapsed > 0 ? mtdActual / clampedElapsed : 0;
  const valuesByDay = new Map<number, number>();

  if (lastObservedPoint) {
    for (let day = lastObservedPoint.day; day <= totalDaysInMonth; day++) {
      const offset = day - lastObservedPoint.day;
      const projectedValue = offset === 0 ? mtdActual : roundCurrency(mtdActual + dailyAverage * offset);
      valuesByDay.set(day, projectedValue);
    }
  } else {
    for (let day = operatingStartDay; day <= totalDaysInMonth; day++) {
      const offset = day - operatingStartDay + 1;
      const projectedValue = roundCurrency(dailyAverage * offset);
      valuesByDay.set(day, projectedValue);
    }
  }

  const projectedEom = roundCurrency(dailyAverage * totalOperatingDays);

  return {
    valuesByDay,
    projectedEom,
    lastActualDay: lastObservedPoint?.day ?? 0,
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

function computeOperatingWindow({
  year,
  month,
  totalDays,
  isCurrentMonth,
}: {
  year: number;
  month: number;
  totalDays: number;
  isCurrentMonth: boolean;
}): OperatingWindow {
  const monthIndex = month - 1;
  const monthStart = new Date(year, monthIndex, 1);
  const monthEndDate = new Date(year, monthIndex, totalDays);
  const today = startOfDay(new Date());
  const systemStart = startOfDay(SYSTEM_START_DATE);

  const baseStart = systemStart > monthStart ? systemStart : monthStart;
  if (baseStart > monthEndDate) {
    const futureStart = startOfDay(baseStart);
    return {
      effectiveStartDate: futureStart,
      operatingStartDay: totalDays + 1,
      totalOperatingDays: 0,
      daysElapsed: 0,
      observationEndDate: futureStart,
      monthEndDate,
    };
  }

  const effectiveStartDate = startOfDay(baseStart);
  const operatingStartDay =
    effectiveStartDate.getFullYear() === year && effectiveStartDate.getMonth() === monthIndex
      ? effectiveStartDate.getDate()
      : 1;

  const totalOperatingDays = Math.max(totalDays - operatingStartDay + 1, 0);
  const observationCap = isCurrentMonth ? today : today < monthEndDate ? today : monthEndDate;
  const observationEndDate = observationCap > monthEndDate ? monthEndDate : observationCap;

  let daysElapsed = 0;
  if (totalOperatingDays > 0 && observationEndDate >= effectiveStartDate) {
    const diff = startOfDay(observationEndDate).getTime() - effectiveStartDate.getTime();
    daysElapsed = Math.floor(diff / DAY_IN_MS) + 1;
    daysElapsed = Math.min(Math.max(daysElapsed, 0), totalOperatingDays);
  }

  return {
    effectiveStartDate,
    operatingStartDay,
    totalOperatingDays,
    daysElapsed,
    observationEndDate,
    monthEndDate,
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
