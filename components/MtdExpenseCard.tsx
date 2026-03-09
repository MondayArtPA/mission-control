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

  const dailyData = useMemo(() => buildDailyData(effectiveMonth, dailyTrend, monthDays), [effectiveMonth, dailyTrend, monthDays]);
  const chartMax = Math.max(...dailyData.map((entry) => entry.total), dailyBudget) * 1.2 || dailyBudget * 1.2;

  return (
    <div className="border border-border rounded-2xl bg-[#0f0f0f] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">MTD Expense</h3>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={effectiveMonth}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-white/10 bg-transparent px-3 py-1 text-sm text-white outline-none transition focus:border-accent-cyan/60 focus:ring-2 focus:ring-accent-cyan/40"
          />
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="text-4xl font-semibold text-white">{formatTHB(totalSpent)}</div>
      <div className="text-sm text-gray-500 mt-1">({formatUSD(totalSpent / USD_EXCHANGE_RATE)})</div>
      <div className="text-sm text-gray-400 mt-2">
        Remaining: {formatTHB(remaining)} ({formatUSD(remaining / USD_EXCHANGE_RATE)})
      </div>

      <div className="mt-6 h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} barCategoryGap={6} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} interval={0} />
            <YAxis hide domain={[0, chartMax]} />
            <RechartsTooltip
              cursor={{ fill: "rgba(52, 211, 153, 0.08)" }}
              contentStyle={{
                backgroundColor: "#0f0f0f",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.75rem",
                color: "#f3f4f6",
                fontSize: "0.85rem",
                fontFamily: "'Space Mono', 'DM Mono', monospace",
              }}
              formatter={(value: number) => {
                const usdValue = value / USD_EXCHANGE_RATE;
                return [`${formatTHB(value)} (${formatUSD(usdValue)})`, "Spend"];
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
