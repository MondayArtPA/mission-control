"use client";

import { Fragment } from "react";
import type { KnowledgePrefix, KnowledgeStatus, KnowledgeSummary } from "@/types/knowledge";

interface KnowledgeListProps {
  files: KnowledgeSummary[];
  onView: (file: KnowledgeSummary) => void;
  onEdit: (file: KnowledgeSummary) => void;
  onVerify: (file: KnowledgeSummary) => void;
  onApprove?: (file: KnowledgeSummary) => void;
  onDelete?: (file: KnowledgeSummary) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const GROUP_CONFIG: Record<KnowledgePrefix, { label: string; icon: string; description: string }> = {
  sys: { label: "System", icon: "🧭", description: "Architecture, infra, and config" },
  dec: { label: "Decisions", icon: "⚖️", description: "Business & ops calls" },
  run: { label: "Runbooks", icon: "🛠️", description: "Operational playbooks" },
  misc: { label: "Misc", icon: "📄", description: "Other notes" },
};

const STATUS_CONFIG: Record<KnowledgeStatus, { label: string; tone: string }> = {
  current: { label: "Current", tone: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40" },
  verify_soon: { label: "Verify Soon", tone: "bg-amber-400/10 text-amber-200 border border-amber-400/40" },
  expired: { label: "Expired", tone: "bg-red-500/10 text-red-300 border border-red-500/40" },
  needs_approval: { label: "Needs Approval", tone: "bg-yellow-500/10 text-yellow-200 border border-yellow-500/40" },
  unknown: { label: "Unknown", tone: "bg-slate-500/10 text-slate-200 border border-slate-500/30" },
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export default function KnowledgeList({
  files,
  onView,
  onEdit,
  onVerify,
  onApprove,
  onDelete,
  loading,
  emptyMessage = "ยังไม่มี knowledge files",
}: KnowledgeListProps) {
  const grouped = files.reduce<Record<KnowledgePrefix, KnowledgeSummary[]>>(
    (acc, file) => {
      const key: KnowledgePrefix = GROUP_CONFIG[file.prefix] ? file.prefix : "misc";
      acc[key].push(file);
      return acc;
    },
    { sys: [], dec: [], run: [], misc: [] }
  );

  const hasEntries = files.length > 0;

  return (
    <div className="space-y-6">
      {loading && <div className="rounded-2xl border border-border/60 bg-[#0f131b] p-4 text-sm text-gray-400">กำลังโหลด...</div>}
      {!loading && !hasEntries && <div className="rounded-2xl border border-border/60 bg-[#0f131b] p-6 text-sm text-gray-400">{emptyMessage}</div>}
      {Object.entries(grouped).map(([prefix, entries]) => {
        if (!entries.length) return <Fragment key={prefix} />;
        const config = GROUP_CONFIG[prefix as KnowledgePrefix];
        return (
          <div key={prefix} className="rounded-3xl border border-border/80 bg-[#0b0f15] p-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="text-2xl">{config.icon}</div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-accent-cyan/80">{config.label}</p>
                <p className="text-sm text-gray-400">{config.description}</p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {entries.map((entry) => {
                const statusInfo = STATUS_CONFIG[entry.status];
                return (
                  <div key={entry.filename} className="rounded-2xl border border-white/5 bg-[#0f141c] p-4 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm text-white">{entry.filename}</p>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusInfo.tone}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          <div>Updated: {formatDate(entry.metadata?.last_updated as string)} • by {entry.metadata?.updated_by ?? "—"}</div>
                          {entry.metadata?.verify_after && <div>Verify after: {formatDate(entry.metadata.verify_after as string)}</div>}
                          <div>Lines: {entry.lines} • Size: {Math.round(entry.size / 1024 * 10) / 10} KB</div>
                          {entry.snippet && <div className="mt-2 text-[11px] text-gray-500">“…{entry.snippet}…”</div>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <button type="button" className="rounded-xl border border-border/60 px-3 py-1 text-gray-200 transition hover:border-accent-cyan hover:text-white" onClick={() => onView(entry)}>
                          View
                        </button>
                        <button type="button" className="rounded-xl border border-border/60 px-3 py-1 text-gray-200 transition hover:border-accent-cyan hover:text-white" onClick={() => onEdit(entry)}>
                          Edit
                        </button>
                        <button type="button" className="rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1 text-accent-cyan transition hover:bg-accent-cyan/20" onClick={() => onVerify(entry)}>
                          Verify
                        </button>
                        {entry.prefix === "dec" && entry.metadata?.approved !== true && onApprove && (
                          <button
                            type="button"
                            className="rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-amber-200 transition hover:bg-amber-400/20"
                            onClick={() => onApprove(entry)}
                          >
                            Approve
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            className="rounded-xl border border-red-500/60 px-3 py-1 text-red-300 transition hover:bg-red-500/10"
                            onClick={() => onDelete(entry)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
