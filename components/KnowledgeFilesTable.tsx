interface KnowledgeFileEntry {
  file: string;
  lastUpdated?: string;
  verifyAfter?: string;
  statusOverride?: "expired" | "expiring" | "missing" | "ok";
}

interface KnowledgeFilesTableProps {
  entries: KnowledgeFileEntry[];
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getStatus = (entry: KnowledgeFileEntry): { label: string; variant: "ok" | "warning" | "critical" | "unknown" } => {
  if (entry.statusOverride === "missing") {
    return { label: "Missing header", variant: "warning" };
  }

  if (entry.statusOverride === "expired") {
    return { label: "Expired", variant: "critical" };
  }

  const verifyDate = entry.verifyAfter ? new Date(entry.verifyAfter) : null;
  if (!verifyDate || Number.isNaN(verifyDate.getTime())) {
    return { label: "No verify date", variant: "unknown" };
  }

  const now = new Date();
  const diffDays = (verifyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return { label: "Expired", variant: "critical" };
  }

  if (diffDays <= 7) {
    return { label: "Expiring Soon", variant: "warning" };
  }

  return { label: "OK", variant: "ok" };
};

const STATUS_TAGS: Record<"ok" | "warning" | "critical" | "unknown", string> = {
  ok: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30",
  warning: "bg-amber-400/10 text-amber-300 border border-amber-400/30",
  critical: "bg-red-500/10 text-red-300 border border-red-500/30",
  unknown: "bg-gray-600/10 text-gray-300 border border-gray-500/30",
};

export default function KnowledgeFilesTable({ entries }: KnowledgeFilesTableProps) {
  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-border/80 bg-[#0f131b] p-6 text-sm text-gray-400">
        No knowledge file records in health data.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-[#0f131b] p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-cyan/70">Knowledge Layer</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">File health</h2>
          <p className="text-sm text-gray-400">Verify cadence and expiring sources</p>
        </div>
        <div className="text-xs font-mono text-gray-400">{entries.length} files tracked</div>
      </div>

      <div className="mt-6 -mx-4 overflow-x-auto pb-2 sm:mx-0">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-500">
              <th className="pb-3 font-normal">File</th>
              <th className="pb-3 font-normal">Last Updated</th>
              <th className="pb-3 font-normal">Verify After</th>
              <th className="pb-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.map((entry) => {
              const status = getStatus(entry);
              return (
                <tr key={entry.file} className="text-gray-200">
                  <td className="py-3 font-mono text-xs sm:text-sm">{entry.file}</td>
                  <td className="py-3 text-gray-400">{formatDate(entry.lastUpdated)}</td>
                  <td className="py-3 text-gray-400">{formatDate(entry.verifyAfter)}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_TAGS[status.variant]}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { KnowledgeFileEntry };
