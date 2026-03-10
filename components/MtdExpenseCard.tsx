"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatusBadge from "@/components/StatusBadge";
import type { ExpenseSummaryApiPayload, ExpenseTrendPoint } from "@/types/expenses";

const USD_EXCHANGE_RATE = 33;
const BAR_GRADIENT_ID = "mtd-bar-gradient";
const formatMonthLabel = (value: string) => {
  const [year, month] = value.split('-');
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
    return value;
  }
  return new Date(parsedYear, parsedMonth - 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let year = 2026; year <= 2030; year++) {
    for (let month = 1; month <= 12; month++) {
      const value = `${year}-${String(month).padStart(2, '0')}`;
      options.push({ value, label: formatMonthLabel(value) });
    }
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();


const formatTHB = (value: number) =>
  `฿${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const parseMonthParts = (month: string) => {
  const [year, rawMonth] = month.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(rawMonth);
  if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)) {
    return { year: parsedYear, month: parsedMonth };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const getDaysInMonth = (month: string) => {
  const { year, month: monthIndex } = parseMonthParts(month);
  return new Date(year, monthIndex, 0).getDate();
};

const buildDailyData = (month: string, points: ExpenseTrendPoint[], daysInMonth: number) => {
  const { year, month: monthIndex } = parseMonthParts(month);
  const prefix = `${year}-${String(monthIndex).padStart(2, "0")}`;
  const pointsByDate = new Map(points.map((point) => [point.date, point]));

  return Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const dateKey = `${prefix}-${String(day).padStart(2, "0")}`;
    const point = pointsByDate.get(dateKey);

    return {
      day,
      label: String(day),
      total: point?.total ?? 0,
    };
  });
};

type MtdExpenseCardProps = {
  summary: ExpenseSummaryApiPayload | null;
  month: string;
  setMonth: (value: string) => void;
};

export default function MtdExpenseCard({ summary, month, setMonth }: MtdExpenseCardProps) {
  const effectiveMonth = month || summary?.month || getCurrentMonth();
  const monthDays = getDaysInMonth(effectiveMonth);
  const monthlyBudget = summary?.metrics?.totals?.budget ?? 1500;
  const totalSpent = summary?.metrics?.totals?.spent ?? 0;
  const remaining = summary?.metrics?.totals?.remaining ?? Math.max(monthlyBudget - totalSpent, 0);
  const status = summary?.metrics?.totals?.status ?? "normal";
  const dailyTrend = summary?.metrics?.trend?.daily ?? [];
  const dailyBudget = monthlyBudget / monthDays;
  const monthSelectOptions = useMemo(() => {
    if (MONTH_OPTIONS.some((option) => option.value === effectiveMonth)) {
      return MONTH_OPTIONS;
    }
    return [...MONTH_OPTIONS, { value: effectiveMonth, label: formatMonthLabel(effectiveMonth) }];
  }, [effectiveMonth]);

  const dailyData = useMemo(
    () => buildDailyData(effectiveMonth, dailyTrend, monthDays),
    [effectiveMonth, dailyTrend, monthDays],
  );
  const chartMax = Math.max(...dailyData.map((entry) => entry.total), dailyBudget) * 1.2 || dailyBudget * 1.2;

  return (
    <div className="border border-border rounded-2xl bg-[#0f0f0f] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">MTD Total Expense</h3>
          <StatusBadge status={status} />
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

      <div className="text-4xl font-semibold text-white">{formatTHB(totalSpent)}</div>
      <div className="text-sm text-gray-500 mt-1">({formatUSD(totalSpent / USD_EXCHANGE_RATE)})</div>
      <div className="text-[10px] text-gray-500 mt-2">
        Remaining (Month): {formatTHB(remaining)} ({formatUSD(remaining / USD_EXCHANGE_RATE)})
      </div>

      <div className="mt-6 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} barCategoryGap={6} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} minTickGap={8} />
            <YAxis hide width={48} domain={[0, chartMax]} />
            <RechartsTooltip
              cursor={{ fill: "rgba(52, 211, 153, 0.08)" }}
              contentStyle={{
                backgroundColor: "#0f0f0f",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.75rem",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontFamily: "'Space Mono', 'DM Mono', monospace",
              }}
              labelStyle={{
                color: "#ffffff",
              }}
              itemStyle={{
                color: "#ffffff",
              }}
              formatter={(value) => {
                const numVal = typeof value === "number" ? value : Number(value) || 0;
                const usdValue = numVal / USD_EXCHANGE_RATE;
                return [`${formatTHB(numVal)} (${formatUSD(usdValue)})`, "Spend"] as [string, string];
              }}
              labelFormatter={(label) => `Day ${label}`}
            />
            <ReferenceLine
              y={dailyBudget}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: `Daily Budget: ${formatTHB(dailyBudget)}`,
                position: "right",
                fill: "#9ca3af",
                fontSize: 10,
              }}
            />
            <Bar dataKey="total" radius={[4, 4, 2, 2]} maxBarSize={18}>
              {dailyData.map((entry) => (
                <Cell
                  key={`mtd-bar-${entry.day}`}
                  fill={entry.total > dailyBudget ? "#ef4444" : `url(#${BAR_GRADIENT_ID})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
        <svg width="18" height="2" className="flex-shrink-0" aria-hidden>
          <line x1="0" y1="1" x2="18" y2="1" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" />
        </svg>
        <span>
          Daily Budget: {formatTHB(dailyBudget)} ({formatUSD(dailyBudget / USD_EXCHANGE_RATE)})
        </span>
      </div>
    </div>
  );
}
