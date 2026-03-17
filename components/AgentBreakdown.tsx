"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

type TooltipPayload = {
  payload?: ChartDatum;
  value?: ValueType;
  name?: NameType;
};
import type { ExpenseBreakdownWithShare, ExpenseSummaryApiPayload } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const AGENT_ALIAS_MAP: Record<string, string> = {
  MONDAY: "Monday",
  MAIN: "Monday",
  BLUEPRINT: "Blueprint",
  QUANT: "Quant",
  PIXAR: "Pixar",
  SWISS: "Swiss",
};

const AGENT_COLORS: Record<string, string> = {
  Monday: "#22d3ee",
  Blueprint: "#a855f7",
  Quant: "#34d399",
  Pixar: "#facc15",
  Swiss: "#f472b6",
};

const DEFAULT_AGENT_COLOR = "#f472b6";

function normalizeAgentName(key?: string | null) {
  if (!key) return "Unknown";
  const trimmed = key.trim();
  if (!trimmed) return "Unknown";
  const alias = AGENT_ALIAS_MAP[trimmed.toUpperCase()];
  if (alias) return alias;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

interface AgentBreakdownProps {
  summary: ExpenseSummaryApiPayload | null;
  loading: boolean;
}

interface ChartDatum extends ExpenseBreakdownWithShare {
  name: string;
}

const BreakdownTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as ChartDatum | undefined;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border bg-[#050505]/95 px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-foreground">{data.name}</div>
      <div className="mt-1 text-gray-400">{THB.format(data.total)}</div>
      <div className="text-[11px] font-mono text-gray-500">{data.percent.toFixed(1)}% share</div>
    </div>
  );
};

export default function AgentBreakdown({ summary, loading }: AgentBreakdownProps) {
  const metricsBreakdown = summary?.metrics?.breakdown.byAgent ?? [];
  const fallback = summary?.breakdown.byAgent ?? [];
  const source = metricsBreakdown.length ? metricsBreakdown : fallback;
  const aggregated = new Map<string, ChartDatum>();

  source.forEach((item) => {
    const name = normalizeAgentName(item.key);
    const existing = aggregated.get(name);
    if (existing) {
      existing.total += item.total;
      existing.count = (existing.count ?? 0) + (item.count ?? 0);
    } else {
      aggregated.set(name, {
        ...item,
        key: name,
        name,
        total: item.total,
        percent: 0,
      });
    }
  });

  const combinedTotal = Array.from(aggregated.values()).reduce((sum, item) => sum + item.total, 0);
  const data: ChartDatum[] = Array.from(aggregated.values())
    .map((item) => ({
      ...item,
      percent: combinedTotal > 0 ? (item.total / combinedTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <section className="rounded-2xl border border-border bg-[#0d0d0d] p-4 sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.28em] text-gray-500">Agents</p>
        <h2 className="text-lg font-semibold text-foreground">Breakdown by agent</h2>
        <p className="text-sm text-gray-500">Combined view of each agent's spend share (aliases merged).</p>
      </div>
      <div className="h-56 sm:h-64">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">No agent spend logged.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 16 }}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="name" stroke="#666" tickLine={false} fontSize={12} />
              <YAxis
                stroke="#666"
                tickLine={false}
                fontSize={12}
                tickFormatter={(value) => (Number(value) / 1000 >= 1 ? `${(Number(value) / 1000).toFixed(1)}k` : `${value}`)}
              />
              <Tooltip content={<BreakdownTooltip />} cursor={{ fill: "#111", opacity: 0.1 }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.key} fill={AGENT_COLORS[entry.key] ?? DEFAULT_AGENT_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {data.length > 0 && (
        <div className="mt-4 space-y-1 text-xs font-mono text-gray-400">
          {data.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: AGENT_COLORS[item.key] ?? DEFAULT_AGENT_COLOR }}
                />
                {item.name}
              </div>
              <span>
                {THB.format(item.total)} · {item.percent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
