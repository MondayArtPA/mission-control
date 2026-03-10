"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";
import type { ExpenseSummaryApiPayload, ExpenseTrendPoint } from "@/types/expenses";

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const FULL_DATE = new Intl.DateTimeFormat("th-TH", { dateStyle: "full" });

interface DailySpendGraphProps {
  summary: ExpenseSummaryApiPayload | null;
  loading: boolean;
  error: string | null;
}

interface ChartDatum extends ExpenseTrendPoint {
  label: string;
}

function toChartData(points: ExpenseTrendPoint[] = []): ChartDatum[] {
  return points.map((point) => ({
    ...point,
    label: SHORT_DATE.format(new Date(`${point.date}T00:00:00`)),
  }));
}

const TrendTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as ChartDatum | undefined;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border bg-[#050505]/95 px-3 py-2 shadow-xl">
      <div className="text-[11px] font-mono uppercase text-gray-500">
        {FULL_DATE.format(new Date(`${data.date}T00:00:00`))}
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Daily</span>
          <span className="font-semibold text-accent-cyan">{THB.format(data.total)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-gray-400">Cumulative</span>
          <span className="font-semibold text-accent-magenta">{THB.format(data.cumulative)}</span>
        </div>
      </div>
    </div>
  );
};

export default function DailySpendGraph({ summary, loading, error }: DailySpendGraphProps) {
  const daily = summary?.metrics?.trend.daily ?? [];
  const chartData = toChartData(daily);
  const alertLine = summary?.metrics?.totals.alertThreshold ?? 1200;
  const restrictLine = summary?.metrics?.totals.restrictThreshold ?? 1395;

  return (
    <section className="rounded-2xl border border-border bg-[#0d0d0d] p-4 sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.28em] text-gray-500">Daily spend</p>
        <h2 className="text-lg font-semibold text-foreground">Progression vs budget guardrails</h2>
        <p className="text-sm text-gray-500">Visualizing both per-day spend and cumulative usage.</p>
      </div>
      <div className="h-80">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-300">{error}</div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading expense trend…</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No spend data for this month yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#666" tickLine={false} fontSize={12} />
              <YAxis
                stroke="#666"
                tickLine={false}
                tickFormatter={(value) => `${Math.round(Number(value))}`}
                fontSize={12}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#2a2a2a" }} />
              <Legend wrapperStyle={{ color: "#999", fontSize: 12 }} />
              <ReferenceLine
                y={alertLine}
                stroke="#facc15"
                strokeDasharray="4 4"
                label={{ value: `Alert ฿${alertLine.toLocaleString()}`, fill: "#facc15", position: "right", fontSize: 11 }}
              />
              <ReferenceLine
                y={restrictLine}
                stroke="#fb923c"
                strokeDasharray="4 4"
                label={{ value: `Restrict ฿${restrictLine.toLocaleString()}`, fill: "#fb923c", position: "right", fontSize: 11 }}
              />
              <Line type="monotone" dataKey="total" name="Daily" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#f472b6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
