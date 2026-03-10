interface DiskUsageItem {
  label: string;
  valueMb: number;
  percent: number;
  accent?: string;
}

interface DiskUsageChartProps {
  items: DiskUsageItem[];
  totalMb?: number;
}

const defaultAccents = [
  "from-cyan-400/80 to-cyan-500/70",
  "from-blue-400/80 to-blue-500/70",
  "from-emerald-400/80 to-emerald-500/70",
  "from-purple-400/80 to-purple-500/70",
  "from-orange-400/80 to-orange-500/70",
  "from-pink-400/80 to-pink-500/70",
  "from-amber-400/80 to-amber-500/70",
];

const formatMb = (value: number) => `${value.toLocaleString()} MB`;

export default function DiskUsageChart({ items, totalMb }: DiskUsageChartProps) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-border/80 bg-[#0f131b] p-6 text-sm text-gray-400">
        No disk usage data available.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-[#0f131b] p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-cyan/70">Disk Usage</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Workspace footprint</h2>
          <p className="text-sm text-gray-400">Across agents + mission control</p>
        </div>
        {typeof totalMb === "number" && (
          <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-2 text-xs font-mono text-gray-200">
            Total: {formatMb(totalMb)}
          </div>
        )}
      </div>

      <div className="mt-6 -mx-2 flex gap-4 overflow-x-auto pb-4 sm:mx-0 sm:flex-col sm:gap-4 sm:overflow-visible">
        {items.map((item, index) => {
          const percentWidth = Math.min(Math.max(item.percent, 0), 100);
          const accent = item.accent ?? defaultAccents[index % defaultAccents.length];

          return (
            <div key={item.label} className="min-w-[230px] flex-1 rounded-2xl border border-white/5 bg-black/20 p-4 sm:min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-gray-400">
                <span className="text-gray-200">{item.label}</span>
                <span>
                  {formatMb(Math.round(item.valueMb))} · {percentWidth.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 h-2.5 w-full rounded-full bg-[#151a24]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${accent}`}
                  style={{ width: `${percentWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
