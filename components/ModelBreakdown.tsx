"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ExpenseSummaryApiPayload } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

interface ModelDatum {
  name: string;
  total: number;
  count: number;
  percent: number;
}

interface ModelBreakdownProps {
  summary: ExpenseSummaryApiPayload | null;
  loading: boolean;
}

const ModelTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as ModelDatum | undefined;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border bg-[#050505]/95 px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-foreground">{data.name}</div>
      <div className="mt-1 text-gray-400">{THB.format(data.total)}</div>
      <div className="text-[11px] font-mono text-gray-500">{data.count} usages</div>
      <div className="text-[11px] font-mono text-gray-500">{data.percent.toFixed(1)}% of spend</div>
    </div>
  );
};

export default function ModelBreakdown({ summary, loading }: ModelBreakdownProps) {
  const breakdown = (summary?.metrics?.breakdown.byModel?.length ? summary.metrics.breakdown.byModel : summary?.breakdown.byModel) ?? [];
  const sortedBreakdown = [...breakdown].sort((a, b) => b.total - a.total);
  const totalSpend = sortedBreakdown.reduce((sum, item) => sum + item.total, 0);
  const data: ModelDatum[] = sortedBreakdown.map((item) => ({
    name: item.key,
    total: item.total,
    count: item.count,
    percent: totalSpend > 0 ? (item.total / totalSpend) * 100 : 0,
  }));

  return (
    <section className="rounded-2xl border border-border bg-[#0d0d0d] p-4 sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.28em] text-gray-500">Models</p>
        <h2 className="text-lg font-semibold text-foreground">Breakdown by model</h2>
        <p className="text-sm text-gray-500">Cost and usage count per foundation model.</p>
      </div>
      <div className="h-56 sm:h-64">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">No model spend logged.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid stroke="#1f1f1f" />
              <XAxis type="number" stroke="#666" tickLine={false} fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#666"
                tickLine={false}
                fontSize={12}
                width={200}
                interval={0}
              />
              <Tooltip content={<ModelTooltip />} cursor={{ fill: "#111", opacity: 0.1 }} />
              <Bar dataKey="total" fill="#38bdf8" radius={[0, 6, 6, 0]}> 
                <LabelList
                  dataKey="count"
                  position="right"
                  formatter={(value) => `${value}x`}
                  className="text-[11px] font-mono fill-gray-400"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
          {data.length > 0 && (
        <div className="mt-4 space-y-1 text-xs font-mono text-gray-400">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
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
