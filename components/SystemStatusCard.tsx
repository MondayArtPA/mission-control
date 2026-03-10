interface SystemStatusCardProps {
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  statusLabel: string;
  variant?: "ok" | "warning" | "critical" | "unknown" | "neutral";
}

const VARIANT_STYLES: Record<NonNullable<SystemStatusCardProps["variant"]>, string> = {
  ok: "border-emerald-400/30 bg-emerald-400/5",
  warning: "border-amber-400/40 bg-amber-400/5",
  critical: "border-red-500/40 bg-red-500/5",
  unknown: "border-gray-600/40 bg-gray-800/30",
  neutral: "border-accent-cyan/25 bg-[#0f131b]",
};

const DOT_STYLES: Record<NonNullable<SystemStatusCardProps["variant"]>, string> = {
  ok: "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.65)]",
  warning: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]",
  critical: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.55)]",
  unknown: "bg-gray-500",
  neutral: "bg-accent-cyan/80 shadow-[0_0_12px_rgba(34,211,238,0.45)]",
};

export default function SystemStatusCard({
  label,
  primaryValue,
  secondaryValue,
  statusLabel,
  variant = "neutral",
}: SystemStatusCardProps) {
  const variantClass = VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral;
  const dotClass = DOT_STYLES[variant] ?? DOT_STYLES.unknown;

  return (
    <div className={`rounded-3xl border ${variantClass} p-4 sm:p-6 text-left`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-gray-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">{primaryValue}</p>
          {secondaryValue && <p className="mt-1 text-sm text-gray-400">{secondaryValue}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-200">
            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
            {statusLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
