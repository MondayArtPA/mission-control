"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import ExpenseSection from "@/components/ExpenseSection";
import ExpenseCalculationInfo from "@/components/ExpenseCalculationInfo";
import ExpenseOverviewCard from "@/components/ExpenseOverviewCard";
import DailySpendGraph from "@/components/DailySpendGraph";
import AgentBreakdown from "@/components/AgentBreakdown";
import ModelBreakdown from "@/components/ModelBreakdown";
import MtdExpenseCard from "@/components/MtdExpenseCard";
import StatusBadge from "@/components/StatusBadge";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseSummaryApiPayload } from "@/types/expenses";
import { Activity } from "lucide-react";
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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YTD_BAR_GRADIENT_ID = "ytdMonthlyBarGradient";
const YTD_BAR_RED_GRADIENT_ID = "ytdMonthlyBarRedGradient";
const USD_EXCHANGE_RATE = 33;

const buildYearMonths = (year: number) =>
  Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);

const clampYear = (year: number) => Math.max(2026, Math.min(2030, year));

const getYearlyBudget = (year: number) => (year === 2026 ? 1500 * 10 : 1500 * 12);

const getYearStartMonth = (year: number) => (year === 2026 ? 3 : 1);

const getYearEndMonth = (year: number, currentYear: number, currentMonth: number) => {
  if (year < currentYear) {
    return 12;
  }

  return currentMonth;
};

const getYtdTotalForYear = (
  monthly: { month: string; amount: number }[],
  year: number,
  currentYear: number,
  currentMonth: number,
) => {
  const startMonth = getYearStartMonth(year);
  const rawEndMonth = getYearEndMonth(year, currentYear, currentMonth);
  const endMonth = Math.max(Math.min(12, rawEndMonth), 1);

  return monthly.reduce((sum, entry) => {
    const [, monthPart] = entry.month.split("-") ?? [];
    const monthNumber = Number(monthPart);

    if (!Number.isFinite(monthNumber)) {
      return sum;
    }

    if (monthNumber < startMonth || monthNumber > endMonth) {
      return sum;
    }

    return sum + entry.amount;
  }, 0);
};

const getUsageStatus = (usagePct: number) => {
  if (usagePct >= 100) return "over";
  if (usagePct >= 93) return "restrict";
  if (usagePct >= 80) return "alert";
  return "normal";
};

const formatTHB = (value: number) =>
  `฿${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type SummaryResponse = {
  success: boolean;
  data?: ExpenseSummaryApiPayload;
  error?: string;
};

export default function ExpensesPage() {
  const expensesHook = useExpenses();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(() => clampYear(currentYear));
  const [ytdTotals, setYtdTotals] = useState<{
    total: number;
    monthly: { month: string; label: string; amount: number }[];
    loading: boolean;
    error: string | null;
  }>({
    total: 0,
    monthly: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchYtdTotals(year: number) {
      try {
        setYtdTotals((prev) => ({ ...prev, loading: true, error: null }));

        const now = new Date();
        const monthsForYear = buildYearMonths(year);
        const monthly = await Promise.all(
          monthsForYear.map(async (month, index) => {
            const monthLabel = MONTH_LABELS[index] ?? month;
            const isFutureMonth = new Date(`${month}-01T00:00:00`).getTime() > now.getTime();

            try {
              const response = await fetch(`/api/expenses/summary?month=${encodeURIComponent(month)}`);
              const data: SummaryResponse = await response.json();

              if (!response.ok || !data.success || !data.data) {
                if (isFutureMonth) {
                  return { month, label: monthLabel, amount: 0 };
                }
                throw new Error(data.error || `Failed to load summary for ${month}`);
              }

              return { month, label: monthLabel, amount: data.data.totalExpense };
            } catch (error) {
              if (isFutureMonth) {
                return { month, label: monthLabel, amount: 0 };
              }
              throw error;
            }
          })
        );

        const total = monthly.reduce((sum, item) => sum + item.amount, 0);

        if (!cancelled) {
          setYtdTotals({ total, monthly, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setYtdTotals({
            total: 0,
            monthly: [],
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load YTD totals",
          });
        }
      }
    }

    fetchYtdTotals(selectedYear);

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const ytdTotal = useMemo(
    () => getYtdTotalForYear(ytdTotals.monthly, selectedYear, currentYear, currentMonth),
    [ytdTotals.monthly, selectedYear, currentYear, currentMonth],
  );
  const ytdUsd = ytdTotal / USD_EXCHANGE_RATE;
  const yearlyBudget = getYearlyBudget(selectedYear);
  const yearlyRemaining = Math.max(yearlyBudget - ytdTotal, 0);
  const yearlyRemainingUsd = yearlyRemaining / USD_EXCHANGE_RATE;
  const usagePct = yearlyBudget > 0 ? (ytdTotal / yearlyBudget) * 100 : 0;
  const ytdStatus = getUsageStatus(usagePct);

  const monthlyBudget = 1500;
  const summaryMonth = expensesHook.summary?.month;
  const [summaryYear, summaryMonthIndex] = summaryMonth?.split("-") ?? [
    String(currentYear),
    String(currentMonth).padStart(2, "0"),
  ];
  const parsedYear = Number(summaryYear);
  const parsedMonth = Number(summaryMonthIndex);
  const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
  const isCurrentMonth = parsedYear === currentYear && parsedMonth === currentMonth;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const dailyBudget = monthlyBudget / daysInMonth;
  const targetAccumulated = dailyBudget * daysElapsed;
  const actualSpent = expensesHook.summary?.totalExpense ?? 0;
  const paceDiff = actualSpent - targetAccumulated;

  const paceStatus =
    paceDiff <= 0
      ? { emoji: "🟢", label: "on pace" }
      : paceDiff <= dailyBudget
        ? { emoji: "🟡", label: "slightly over" }
        : { emoji: "🔴", label: "significantly over" };

  const targetUsd = targetAccumulated / USD_EXCHANGE_RATE;
  const actualUsd = actualSpent / USD_EXCHANGE_RATE;
  const paceDiffLabel = `${paceDiff >= 0 ? "+" : "-"}${formatTHB(Math.abs(paceDiff))}`;
  const targetPct = Math.min((targetAccumulated / monthlyBudget) * 100, 100);
  const actualPct = Math.min((actualSpent / monthlyBudget) * 100, 100);

  return (
    <AppShell
      eyebrow="Finance"
      title="Expenses"
      description="Review category performance, recent outflows, and log new spend in a dedicated dashboard page."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-border rounded-2xl bg-[#0f0f0f] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">YTD Total Expense</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2026}
                  max={2030}
                  step={1}
                  value={selectedYear}
                  onChange={(event) => {
                    const nextYear = Number(event.target.value);
                    if (Number.isNaN(nextYear)) return;
                    setSelectedYear(clampYear(nextYear));
                  }}
                  className="w-24 rounded-lg border border-white/10 bg-transparent px-3 py-1 text-sm text-white outline-none transition focus:border-accent-cyan/60 focus:ring-2 focus:ring-accent-cyan/40"
                />
                <StatusBadge status={ytdStatus} />
              </div>
            </div>
            <div className="text-4xl font-semibold text-white">
              {ytdTotals.loading ? (
                <div className="h-10 w-32 animate-pulse rounded-lg bg-[#1a1a1a]" />
              ) : (
                formatTHB(ytdTotal)
              )}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {ytdTotals.loading ? (
                <div className="h-4 w-24 animate-pulse rounded bg-[#1a1a1a]" />
              ) : (
                <>({formatUSD(ytdUsd)})</>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {ytdTotals.loading ? (
                <div className="h-4 w-48 animate-pulse rounded bg-[#1a1a1a]" />
              ) : (
                <>Remaining (Year): {formatTHB(yearlyRemaining)} ({formatUSD(yearlyRemainingUsd)})</>
              )}
            </div>
            {ytdTotals.error && <p className="mt-3 text-xs text-red-400">{ytdTotals.error}</p>}
            <div className="mt-6 h-[150px]">
              {ytdTotals.loading ? (
                <div className="h-full w-full animate-pulse rounded-2xl bg-[#131313]" />
              ) : ytdTotals.error ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-center text-xs text-red-200">
                  Unable to load monthly breakdown.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ytdTotals.monthly} barCategoryGap={12} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id={YTD_BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id={YTD_BAR_RED_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis hide domain={[0, (dataMax: number) => Math.max(1500, dataMax) * 1.15]} />
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
                        return [`${formatTHB(value)} (${formatUSD(usdValue)})`, ""];
                      }}
                      labelFormatter={(label, payload) => {
                        const monthKey = payload?.[0]?.payload?.month ?? label;
                        const shortLabel = payload?.[0]?.payload?.label ?? label;
                        if (!monthKey) return label;
                        const [year] = monthKey.split("-") ?? [];
                        return `${shortLabel} ${year ?? ""}`.trim();
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill={`url(#${YTD_BAR_GRADIENT_ID})`}
                      radius={[4, 4, 2, 2]}
                      maxBarSize={16}
                    >
                      {ytdTotals.monthly.map((entry, index) => (
                        <Cell
                          key={`ytd-bar-cell-${entry.month ?? index}`}
                          fill={`url(#${entry.amount > monthlyBudget ? YTD_BAR_RED_GRADIENT_ID : YTD_BAR_GRADIENT_ID})`}
                        />
                      ))}
                    </Bar>
                    <ReferenceLine
                      y={1500}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeOpacity={0.95}
                      strokeDasharray="4 4"
                      ifOverflow="extendDomain"
                      label={{
                        value: `Monthly Budget: ${formatTHB(monthlyBudget)} (${formatUSD(monthlyBudget / USD_EXCHANGE_RATE)})`,
                        position: "right",
                        fill: "#9ca3af",
                        fontSize: 11,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
              <svg width="12" height="2" className="flex-shrink-0" aria-hidden>
                <line
                  x1="0"
                  y1="1"
                  x2="12"
                  y2="1"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                Monthly Budget: {formatTHB(monthlyBudget)} ({formatUSD(monthlyBudget / USD_EXCHANGE_RATE)})
              </span>
            </div>
          </div>

          <MtdExpenseCard
            summary={expensesHook.summary}
            month={expensesHook.month}
            setMonth={expensesHook.setMonth}
          />

          <div className="rounded-2xl border border-border/80 bg-[#0f0f0f] p-5 shadow-[0_0_24px_rgba(0,0,0,0.2)]">
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <Activity size={16} className="text-accent-amber" />
              Budget Pace
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Monthly budget ฿1,500</p>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div>
                <p className="text-lg font-semibold text-white">{formatTHB(actualSpent)} spent</p>
                <p className="text-xs text-gray-500">({formatUSD(actualUsd)})</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Target {formatTHB(targetAccumulated)}</p>
                <p className="text-xs text-gray-500">({formatUSD(targetUsd)})</p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {paceStatus.emoji} {paceStatus.label}
                </span>
                <span>{paceDiffLabel}</span>
              </div>
              <div className="relative mt-2 h-3 rounded-full bg-[#1a1a1a]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent-cyan/40"
                  style={{ width: `${targetPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent-amber"
                  style={{ width: `${actualPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <ExpenseOverviewCard
          summary={expensesHook.summary}
          month={expensesHook.month}
          setMonth={expensesHook.setMonth}
          refreshExpenses={expensesHook.refreshExpenses}
          loading={expensesHook.loading}
        />

        <DailySpendGraph
          summary={expensesHook.summary}
          loading={expensesHook.loading}
          error={expensesHook.error}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <AgentBreakdown summary={expensesHook.summary} loading={expensesHook.loading} />
          <ModelBreakdown summary={expensesHook.summary} loading={expensesHook.loading} />
        </div>

        <ExpenseSection {...expensesHook} />

        <div className="mt-6">
          <ExpenseCalculationInfo />
        </div>
      </div>
    </AppShell>
  );
}
