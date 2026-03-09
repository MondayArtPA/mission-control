"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import ExpenseSection from "@/components/ExpenseSection";
import ExpenseOverviewCard from "@/components/ExpenseOverviewCard";
import DailySpendGraph from "@/components/DailySpendGraph";
import AgentBreakdown from "@/components/AgentBreakdown";
import ModelBreakdown from "@/components/ModelBreakdown";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseSummaryApiPayload } from "@/types/expenses";
import { Activity, PieChart, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

const YTD_MONTHS = Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, "0")}`);
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YTD_BAR_GRADIENT_ID = "ytdMonthlyBarGradient";
const USD_EXCHANGE_RATE = 33;

const formatTHB = (value: number) =>
  `฿${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AGENT_COLORS: Record<string, string> = {
  MONDAY: "#22d3ee",
  BLUEPRINT: "#818cf8",
  QUANT: "#34d399",
};

type SummaryResponse = {
  success: boolean;
  data?: ExpenseSummaryApiPayload;
  error?: string;
};

export default function ExpensesPage() {
  const expensesHook = useExpenses();
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

    async function fetchYtdTotals() {
      try {
        setYtdTotals((prev) => ({ ...prev, loading: true, error: null }));

        const now = new Date();
        const monthly = await Promise.all(
          YTD_MONTHS.map(async (month, index) => {
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

    fetchYtdTotals();

    return () => {
      cancelled = true;
    };
  }, []);

  const ytdUsd = ytdTotals.total / USD_EXCHANGE_RATE;

  const agentBreakdownData = useMemo(() => {
    const metricsBreakdown = expensesHook.summary?.metrics?.breakdown.byAgent ?? [];
    const fallbackBreakdown = expensesHook.summary?.breakdown.byAgent ?? [];
    const source = metricsBreakdown.length ? metricsBreakdown : fallbackBreakdown;
    const total = source.reduce((sum, item) => sum + item.total, 0) || 0;

    const agentKeys: (keyof typeof AGENT_COLORS)[] = ["MONDAY", "BLUEPRINT", "QUANT"];

    return agentKeys.map((key) => {
      const item = source.find((entry) => entry.key === key);
      const amount = item?.total ?? 0;
      const percent = item?.percent ?? (total > 0 ? (amount / total) * 100 : 0);

      return {
        key,
        label: key,
        total: amount,
        percent,
        color: AGENT_COLORS[key] ?? "#f472b6",
      };
    });
  }, [expensesHook.summary]);

  const monthlyBudget = 1500;
  const summaryMonth = expensesHook.summary?.month;
  const today = new Date();
  const [summaryYear, summaryMonthIndex] = summaryMonth?.split("-") ?? [
    String(today.getFullYear()),
    String(today.getMonth() + 1).padStart(2, "0"),
  ];
  const parsedYear = Number(summaryYear);
  const parsedMonth = Number(summaryMonthIndex);
  const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
  const isCurrentMonth = parsedYear === today.getFullYear() && parsedMonth === today.getMonth() + 1;
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
          <div className="rounded-2xl border border-border/80 bg-[#0f0f0f] p-5 shadow-[0_0_24px_rgba(0,0,0,0.2)]">
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <TrendingUp size={16} className="text-accent-green" />
              YTD Total Expense
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Jan – Now</p>
            <div className="mt-4 text-4xl font-semibold text-white">
              {ytdTotals.loading ? (
                <div className="h-10 w-32 animate-pulse rounded-lg bg-[#1a1a1a]" />
              ) : (
                formatTHB(ytdTotals.total)
              )}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {ytdTotals.loading ? (
                <div className="h-4 w-24 animate-pulse rounded bg-[#1a1a1a]" />
              ) : (
                <>({formatUSD(ytdUsd)})</>
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
                    </defs>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis hide domain={[0, (dataMax: number) => (dataMax === 0 ? 1000 : dataMax * 1.15)]} />
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
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-[#0f0f0f] p-5 shadow-[0_0_24px_rgba(0,0,0,0.2)]">
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <PieChart size={16} className="text-accent-cyan" />
              Agent Breakdown
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Current month share</p>
            <div className="mt-4 space-y-4">
              {expensesHook.loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="space-y-2">
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[#1a1a1a]" />
                      <div className="h-2 animate-pulse rounded-full bg-[#1a1a1a]" />
                    </div>
                  ))}
                </div>
              ) : agentBreakdownData.every((item) => item.total === 0) ? (
                <p className="text-sm text-gray-500">No agent spend logged this month.</p>
              ) : (
                agentBreakdownData.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                      <span>{item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(item.percent, 100)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{formatTHB(item.total)} spent</p>
                  </div>
                ))
              )}
            </div>
          </div>

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
      </div>
    </AppShell>
  );
}
