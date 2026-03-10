"use client";

import type { ExpenseSummaryApiPayload, TokenUsageGroup } from "@/types/expenses";

const PROVIDER_ORDER = ["Anthropic", "OpenRouter", "OpenAI", "Google", "MiniMax"];
const MAX_ROWS = 6;

function formatTokensShort(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toLocaleString("en-US");
}

function formatTokensLong(value: number) {
  return `${value.toLocaleString("en-US")}`;
}

function formatMonthLabel(month?: string | null) {
  if (!month) return "—";
  const [yearStr, monthStr] = month.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function TokenUsageList({
  title,
  items,
  loading,
}: {
  title: string;
  items: TokenUsageGroup[];
  loading: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`token-skeleton-${title}-${index}`} className="h-10 w-full animate-pulse rounded-lg bg-[#1a1a1a]" />
          ))
        ) : items.length === 0 ? (
          <p className="text-[13px] text-gray-500">No token usage logged yet.</p>
        ) : (
          items.slice(0, MAX_ROWS).map((item) => (
            <div key={`${title}-${item.key}`} className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{item.key}</p>
                <p className="text-[11px] text-gray-500">
                  Input {formatTokensShort(item.input)} · Output {formatTokensShort(item.output)}
                </p>
              </div>
              <p className="text-sm font-mono text-gray-200">{formatTokensShort(item.total)} tokens</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function TokenUsageSection({
  summary,
  loading,
}: {
  summary: ExpenseSummaryApiPayload | null;
  loading: boolean;
}) {
  const tokenUsage = summary?.tokenUsage;
  const hasData = Boolean(tokenUsage && (tokenUsage.byProvider.length > 0 || tokenUsage.byAgent.length > 0));

  const providerEntries = tokenUsage?.byProvider ?? [];
  const providerMap = new Map<string, TokenUsageGroup>(providerEntries.map((item) => [item.key, item]));
  const orderedProviders: TokenUsageGroup[] = [];
  PROVIDER_ORDER.forEach((key) => {
    const match = providerMap.get(key);
    if (match) orderedProviders.push(match);
  });
  providerEntries.forEach((item) => {
    if (!PROVIDER_ORDER.includes(item.key)) {
      orderedProviders.push(item);
    }
  });

  return (
    <div className="w-full border border-border rounded-2xl bg-[#0f0f0f] p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Token Usage ({formatMonthLabel(summary?.month)})
          </p>
          {loading && !hasData ? (
            <div className="mt-2 h-8 w-40 animate-pulse rounded bg-[#1a1a1a]" />
          ) : (
            <p className="mt-1 text-3xl font-semibold text-white">
              {formatTokensShort(tokenUsage?.totals.total ?? 0)} tokens
            </p>
          )}
          {loading && !hasData ? (
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-[#1a1a1a]" />
          ) : (
            <p className="text-[11px] text-gray-500">
              Input {formatTokensLong(tokenUsage?.totals.input ?? 0)} tokens · Output {formatTokensLong(tokenUsage?.totals.output ?? 0)} tokens
            </p>
          )}
        </div>
        {!loading && tokenUsage && (
          <div className="text-xs text-gray-500 md:text-right">
            <p>Entries with automatic provider logs</p>
            <p>Includes Anthropic, OpenAI, Gemini, OpenRouter & MiniMax</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <TokenUsageList title="By Provider" items={orderedProviders} loading={loading && !hasData} />
        <TokenUsageList title="By Agent" items={tokenUsage?.byAgent ?? []} loading={loading && !hasData} />
      </div>
    </div>
  );
}
