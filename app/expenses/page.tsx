"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import ExpenseSection from "@/components/ExpenseSection";
import ExpenseCalculationInfo from "@/components/ExpenseCalculationInfo";
import AgentBreakdown from "@/components/AgentBreakdown";
import ModelBreakdown from "@/components/ModelBreakdown";
import MtdExpenseCard from "@/components/MtdExpenseCard";
import ProgressGuardrailsCard from "@/components/ProgressGuardrailsCard";
import StatusBadge from "@/components/StatusBadge";
import TokenUsageSection from "@/components/TokenUsageSection";
import OpenRouterComparison from "@/components/OpenRouterComparison";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseSummaryApiPayload } from "@/types/expenses";
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
const YEAR_OPTIONS = [2026, 2027, 2028, 2029, 2030];
const YTD_BAR_GRADIENT_ID = "ytdMonthlyBarGradient";
const YTD_BAR_RED_GRADIENT_ID = "ytdMonthlyBarRedGradient";
const USD_EXCHANGE_RATE = 33;

const buildYearMonths = (year: number) =>
  Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);

const clampYear = (year: number) => Math.max(2026, Math.min(2030, year));

const getYearlyBudget = (year: number) => (year === 2026 ? 5000 * 10 : 5000 * 12);

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

const formatCurrencyPair = (thb?: number | null, usd?: number | null) => {
  if (thb == null || usd == null) {
    return '\u2014';
  }
  return `${formatTHB(thb)} (${formatUSD(usd)})`;
};

const formatGapDisplay = (thb?: number | null, pct?: number | null) => {
  if (thb == null || pct == null) {
    return '\u2014';
  }
  return `${formatTHB(thb)} (${pct.toFixed(1)}%)`;
};

const formatBangkokTimestamp = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  });
};

type SummaryResponse = {
  success: boolean;
  data?: ExpenseSummaryApiPayload;
  error?: string;
};

export default function ExpensesPage() {
  const expensesHook = useExpenses();
  const { refreshExpenses } = expensesHook;
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
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

  const handleSyncCosts = useCallback(async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      setSyncError(null);

      const response = await fetch("/api/expenses/sync", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to sync provider costs");
      }

      await refreshExpenses();

      const loggedProviders = Array.isArray(payload.data?.loggedProviders) ? payload.data.loggedProviders : [];
      const syncedCount = loggedProviders.length;
      const totalThb = typeof payload.data?.totals?.thb === "number" ? payload.data.totals.thb : null;

      if (syncedCount === 0) {
        setSyncMessage("No providers synced (missing API keys?)");
      } else {
        const parts = [`Synced ${syncedCount} provider${syncedCount > 1 ? "s" : ""}`];
        if (totalThb && totalThb > 0) {
          parts.push(formatTHB(totalThb));
        }
        setSyncMessage(parts.join(" · "));
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to sync provider costs");
    } finally {
      setSyncing(false);
    }
  }, [refreshExpenses]);

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

  const monthlyBudget = 5000;
  const actualSpent = expensesHook.summary?.totalExpense ?? 0;

  const lastUpdated = useMemo(() => {
    if (!expensesHook.lastUpdatedAt) {
      return '-';
    }
    return expensesHook.lastUpdatedAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok'
    });
  }, [expensesHook.lastUpdatedAt]);

  return (
    <AppShell
      eyebrow="Finance"
      title="Expenses"
      description="Review category performance, recent outflows, and log new spend in a dedicated dashboard page."
    >
      <div className="mb-4 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-gray-500">
            <span>Last updated: {lastUpdated}</span>
          </div>
          <button
            type="button"
            onClick={handleSyncCosts}
            disabled={syncing}
            className="w-full min-h-[44px] rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {syncing ? "Syncing…" : "Sync Costs"}
          </button>
        </div>
        {syncMessage && <p className="text-[11px] font-mono text-emerald-300">{syncMessage}</p>}
        {syncError && <p className="text-[11px] font-mono text-red-400">{syncError}</p>}
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border border-border rounded-2xl bg-[#0f0f0f] p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">YTD Total Expense</h3>
                <StatusBadge status={ytdStatus} />
              </div>
              <select
                value={selectedYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  if (Number.isNaN(nextYear)) return;
                  setSelectedYear(clampYear(nextYear));
                }}
                className="min-h-[44px] w-full rounded px-3 py-2 font-mono text-xs text-white transition focus:border-accent-green focus:outline-none bg-[#1a1a1a] border border-border hover:border-accent-green sm:w-auto"
              >
                {YEAR_OPTIONS.map((yearOption) => (
                  <option key={yearOption} value={yearOption} className="bg-[#0f0f0f] text-white">
                    {yearOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-4xl font-semibold text-white">
              {ytdTotals.loading ? (
                <div className="h-10 w-32 animate-pulse rounded-lg bg-[#1a1a1a]" />
              ) : (
                formatTHB(ytdTotal)
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {ytdTotals.loading ? (
                <div className="h-4 w-24 animate-pulse rounded bg-[#1a1a1a]" />
              ) : (
                <>({formatUSD(ytdUsd)})</>
              )}
            </div>
            <div className="text-[10px] text-gray-500 mt-2">
              {ytdTotals.loading ? (
                <div className="h-4 w-48 animate-pulse rounded bg-[#1a1a1a]" />
              ) : (
                <>Remaining (Year): {formatTHB(yearlyRemaining)} ({formatUSD(yearlyRemainingUsd)})</>
              )}
            </div>
            {ytdTotals.error && <p className="mt-3 text-xs text-red-400">{ytdTotals.error}</p>}
            <div className="mt-6 h-52">
              {ytdTotals.loading ? (
                <div className="h-full w-full animate-pulse rounded-2xl bg-[#131313]" />
              ) : ytdTotals.error ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-center text-xs text-red-200">
                  Unable to load monthly breakdown.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ytdTotals.monthly} barCategoryGap={6} margin={{ left: 12, right: 12, top: 8, bottom: 10 }}>
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
                      padding={{ left: 20, right: 20 }}
                    />
                    <YAxis hide width={48} domain={[0, (dataMax: number) => Math.max(5000, dataMax) * 1.15]} />
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
                      formatter={(value) => {
                        const numVal = typeof value === "number" ? value : Number(value) || 0;
                        const usdValue = numVal / USD_EXCHANGE_RATE;
                        return [`${formatTHB(numVal)} (${formatUSD(usdValue)})`, ""] as [string, string];
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
                      y={5000}
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

          <ProgressGuardrailsCard
            summary={expensesHook.summary}
            loading={expensesHook.loading}
            month={expensesHook.month}
            setMonth={expensesHook.setMonth}
          />
        </div>

        <TokenUsageSection summary={expensesHook.summary} loading={expensesHook.loading} />

        <OpenRouterComparison />

        <div className="grid gap-6 md:grid-cols-2">
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
