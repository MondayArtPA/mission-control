"use client";

import { useEffect, useState } from "react";

interface OpenRouterActualData {
  trackedUsd: number;
  trackedThb: number;
  actualUsd: number;
  actualThb: number;
  gapThb: number;
  gapPct: number;
  updatedAt: string;
}

const formatTHB = (value: number) =>
  `฿${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatUSD = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OpenRouterComparison() {
  const [data, setData] = useState<OpenRouterActualData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/expenses/summary");
        const json = await res.json();
        if (json.data?.openrouterActual) {
          setData(json.data.openrouterActual);
        }
      } catch (error) {
        console.error("Failed to fetch OpenRouter data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full border border-border rounded-2xl bg-[#0f0f0f] p-4 sm:p-5">
        <h3 className="text-base font-semibold text-white mb-4">OpenRouter Spend Comparison (Mar 2026)</h3>
        <div className="h-20 w-full animate-pulse rounded-lg bg-[#1a1a1a]" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { trackedUsd, trackedThb, actualUsd, actualThb, gapThb, gapPct } = data;
  const isHighGap = Math.abs(gapPct) > 10;

  return (
    <div className="w-full border border-border rounded-2xl bg-[#0f0f0f] p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white mb-4">OpenRouter Spend Comparison (Mar 2026)</h3>
      
      <div className="space-y-3">
        <div className="flex flex-col gap-1 text-left sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-sm text-gray-400">Tracked (session logs):</span>
          <div className="text-right">
            <span className="text-lg font-semibold text-white">{formatTHB(trackedThb)}</span>
            <span className="ml-2 text-xs text-gray-500">({formatUSD(trackedUsd)})</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-left sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-sm text-gray-400">Actual (OpenRouter API):</span>
          <div className="text-right">
            <span className="text-lg font-semibold text-white">{formatTHB(actualThb)}</span>
            <span className="ml-2 text-xs text-gray-500">({formatUSD(actualUsd)})</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-border/50 pt-3 text-left sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-sm text-gray-400">Gap:</span>
          <div className="text-right">
            <span className={`text-lg font-semibold ${isHighGap ? 'text-red-400' : 'text-gray-300'}`}>
              {formatTHB(Math.abs(gapThb))}
            </span>
            <span className={`ml-2 text-xs ${isHighGap ? 'text-red-400' : 'text-gray-500'}`}>
              ({Math.abs(gapPct).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {isHighGap && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          ⚠️ Gap exceeds 10% — session logs may be incomplete
        </div>
      )}
    </div>
  );
}
