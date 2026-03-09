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
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ExpenseBreakdownWithShare, ExpenseSummaryApiPayload } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const AGENT_COLORS: Record<string, string> = {
  MONDAY: "#22d3ee",
  BLUEPRINT: "#a855f7",
  QUANT: "#34d399",
};

interface AgentBreakdownProps {
  summary: ExpenseSummaryApiPayload | null;
  loading: boolean;
}

interface ChartDatum extends ExpenseBreakdownWithShare {
  name: string;
}

const BreakdownTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
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
  const total = source.reduce((sum, item) => sum + item.total, 0) || summary?.totalExpense || 0;

  const data: ChartDatum[] = source.map((item) => ({
    ...item,
    name: item.key,
    percent: item.percent ?? (total > 0 ? (item.total / total) * 100 : 0),
  }));

  return (
    <section className="rounded-2xl border border-border bg-[#0d0d0d] p-4">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.28em] text-gray-500">Agents</p>
        <h2 className="text-lg font-semibold text-foreground">Breakdown by agent</h2>
        <p className="text-sm text-gray-500">Comparing MONDAY, BLUEPRINT, QUANT spend share.</p>
      </div>
      <div className="h-64">
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
                  <Cell key={entry.key} fill={AGENT_COLORS[entry.key] ?? "#f472b6"} />
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
                  style={{ backgroundColor: AGENT_COLORS[item.key] ?? "#f472b6" }}
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
