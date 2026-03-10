"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import KnowledgeList from "@/components/knowledge-list";
import KnowledgeViewer from "@/components/knowledge-viewer";
import KnowledgeEditor from "@/components/knowledge-editor";
import type { KnowledgePrefix, KnowledgeSummary } from "@/types/knowledge";

interface KnowledgeWorkspaceProps {
  layout?: "panel" | "page";
}

type ModalState =
  | { mode: "view"; file: KnowledgeSummary; content: string | null }
  | { mode: "edit"; file: KnowledgeSummary; content: string | null }
  | { mode: "add" };

interface CreateFormState {
  prefix: KnowledgePrefix;
  name: string;
  title: string;
  content: string;
}

const DEFAULT_FORM: CreateFormState = {
  prefix: "sys",
  name: "",
  title: "",
  content: "",
};

const PREFIX_OPTIONS: { value: KnowledgePrefix; label: string }[] = [
  { value: "sys", label: "System" },
  { value: "dec", label: "Decision" },
  { value: "run", label: "Runbook" },
];

export default function KnowledgeWorkspace({ layout = "page" }: KnowledgeWorkspaceProps) {
  const [files, setFiles] = useState<KnowledgeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [prefixFilter, setPrefixFilter] = useState<KnowledgePrefix | "all">("all");
  const [updatedByFilter, setUpdatedByFilter] = useState("");

  const [formState, setFormState] = useState<CreateFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/knowledge");
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error ?? "โหลดข้อมูลไม่สำเร็จ");
      }
      setFiles(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, [loadFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: searchTerm.trim() });
        if (prefixFilter !== "all") params.set("prefix", prefixFilter);
        if (updatedByFilter.trim()) params.set("updatedBy", updatedByFilter.trim());
        const response = await fetch(`/api/knowledge/search?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error ?? "ค้นหาไม่สำเร็จ");
        }
        setSearchResults(payload.data ?? []);
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        setSearchError(err instanceof Error ? err.message : "ค้นหาไม่สำเร็จ");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchTerm, prefixFilter, updatedByFilter]);

  const filteredFiles = useMemo(() => {
    if (searchTerm.trim()) {
      return searchResults;
    }
    return files.filter((file) => {
      if (prefixFilter !== "all" && file.prefix !== prefixFilter) return false;
      if (updatedByFilter.trim() && (file.metadata?.updated_by ?? "").toLowerCase() !== updatedByFilter.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [files, prefixFilter, updatedByFilter, searchResults, searchTerm]);

  const openView = async (file: KnowledgeSummary, mode: "view" | "edit") => {
    setModal({ mode, file, content: null });
    setModalLoading(true);
    try {
      const res = await fetch(`/api/knowledge/${encodeURIComponent(file.filename)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error ?? "โหลดไฟล์ไม่สำเร็จ");
      }
      setModal({ mode, file: payload.data, content: payload.data.content });
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "โหลดไฟล์ไม่สำเร็จ");
      setModal(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerify = async (file: KnowledgeSummary) => {
    try {
      const res = await fetch(`/api/knowledge/${encodeURIComponent(file.filename)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifyAfterDays: 30 }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error ?? "Verify ไม่สำเร็จ");
      setBanner(`อัปเดต verify_after ให้ ${file.filename}`);
      await refreshFiles();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Verify ไม่สำเร็จ");
    }
  };

  const handleApprove = async (file: KnowledgeSummary) => {
    try {
      const res = await fetch(`/api/knowledge/${encodeURIComponent(file.filename)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error ?? "Approve ไม่สำเร็จ");
      setBanner(`Approve ${file.filename} แล้ว`);
      await refreshFiles();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Approve ไม่สำเร็จ");
    }
  };

  const handleDelete = async (file: KnowledgeSummary) => {
    if (!window.confirm(`ย้าย ${file.filename} ไป archive?`)) return;
    try {
      const res = await fetch(`/api/knowledge/${encodeURIComponent(file.filename)}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error ?? "ลบไฟล์ไม่สำเร็จ");
      setBanner(`ย้าย ${file.filename} ไป archive แล้ว`);
      await refreshFiles();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "ลบไฟล์ไม่สำเร็จ");
    }
  };

  const handleSaveEdit = async (content: string, file: KnowledgeSummary) => {
    try {
      const res = await fetch(`/api/knowledge/${encodeURIComponent(file.filename)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error ?? "บันทึกไม่สำเร็จ");
      setBanner(`บันทึก ${file.filename} แล้ว`);
      setModal(null);
      await refreshFiles();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setBanner("ต้องตั้งชื่อไฟล์");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: formState.prefix,
          name: formState.name.trim(),
          title: formState.title.trim() || undefined,
          content: formState.content.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload?.error ?? "สร้างไฟล์ไม่สำเร็จ");
      setBanner(`สร้าง ${payload.data?.filename ?? "ไฟล์"} แล้ว`);
      setFormState({ ...DEFAULT_FORM });
      setModal(null);
      await refreshFiles();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "สร้างไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const prefixSummary = useMemo(() => {
    return {
      total: files.length,
      current: files.filter((file) => file.status === "current").length,
      expiring: files.filter((file) => file.status === "verify_soon").length,
      expired: files.filter((file) => file.status === "expired").length,
      needsApproval: files.filter((file) => file.status === "needs_approval").length,
    };
  }, [files]);

  const containerClass = layout === "panel" ? "space-y-5" : "space-y-6";

  return (
    <div className={containerClass}>
      <div className="rounded-3xl border border-border/80 bg-[#0c1118] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-accent-cyan/80">Knowledge Layer</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Knowledge Files</h2>
            <p className="text-sm text-gray-400">{prefixSummary.total} files • {prefixSummary.needsApproval} pending approval • {prefixSummary.expiring} verify soon</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-2xl border border-accent-cyan/50 bg-accent-cyan/10 px-4 py-2 text-sm font-medium text-accent-cyan transition hover:bg-accent-cyan/20"
              onClick={() => {
                setFormState({ ...DEFAULT_FORM });
                setModal({ mode: "add" });
              }}
            >
              + Add Knowledge
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border/60 px-4 py-2 text-sm text-gray-200 transition hover:border-accent-cyan"
              onClick={refreshFiles}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Search</label>
              <input
                type="search"
                placeholder="ค้นหา full-text"
                className="mt-1 w-full rounded-2xl border border-border/60 bg-[#06080f] px-4 py-2 text-sm text-gray-100 focus:border-accent-cyan/50 focus:outline-none"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Prefix</label>
              <select
                value={prefixFilter}
                onChange={(event) => setPrefixFilter(event.target.value as KnowledgePrefix | "all")}
                className="mt-1 rounded-2xl border border-border/60 bg-[#06080f] px-3 py-2 text-sm text-gray-100"
              >
                <option value="all">ทั้งหมด</option>
                <option value="sys">System</option>
                <option value="dec">Decision</option>
                <option value="run">Runbook</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Updated By</label>
              <input
                type="text"
                placeholder="filter"
                className="mt-1 w-full rounded-2xl border border-border/60 bg-[#06080f] px-3 py-2 text-sm text-gray-100"
                value={updatedByFilter}
                onChange={(event) => setUpdatedByFilter(event.target.value)}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-[#090d13] px-4 py-3 text-xs text-gray-400">
            {searchTerm.trim() ? (
              <div>
                Showing {filteredFiles.length} search hits {searching && "• searching..."}
                {searchError && <div className="text-red-300">{searchError}</div>}
              </div>
            ) : (
              <div>
                Current: {prefixSummary.current} • Verify soon: {prefixSummary.expiring} • Expired: {prefixSummary.expired}
              </div>
            )}
          </div>
        </div>
        {banner && (
          <div className="mt-4 rounded-2xl border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-sm text-accent-cyan">
            {banner} <button type="button" className="ml-2 text-xs text-gray-400" onClick={() => setBanner(null)}>close</button>
          </div>
        )}
        {error && <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>}
      </div>

      <KnowledgeList
        files={filteredFiles}
        loading={loading}
        emptyMessage={searchTerm.trim() ? "ไม่พบผลลัพธ์จากการค้นหา" : undefined}
        onView={(file) => openView(file, "view")}
        onEdit={(file) => openView(file, "edit")}
        onVerify={handleVerify}
        onApprove={(file) => handleApprove(file)}
        onDelete={(file) => handleDelete(file)}
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-4xl rounded-3xl border border-border/80 bg-[#06080f] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xl font-semibold text-white">
                {modal.mode === "add" && "Add Knowledge"}
                {modal.mode === "view" && modal.file.filename}
                {modal.mode === "edit" && `Edit ${modal.file.filename}`}
              </h3>
              <button type="button" className="text-gray-400 transition hover:text-white" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>

            {modal.mode === "add" && (
              <form className="mt-4 space-y-4" onSubmit={handleCreate}>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Prefix</label>
                    <select
                      value={formState.prefix}
                      onChange={(event) => setFormState((prev) => ({ ...prev, prefix: event.target.value as KnowledgePrefix }))}
                      className="mt-1 rounded-2xl border border-border/60 bg-[#080b12] px-3 py-2 text-sm text-gray-100"
                    >
                      {PREFIX_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Slug (ไม่ต้องใส่ .md)</label>
                    <input
                      type="text"
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-border/60 bg-[#080b12] px-3 py-2 text-sm text-gray-100"
                      placeholder="mission-control"
                      required
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Title</label>
                    <input
                      type="text"
                      value={formState.title}
                      onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-border/60 bg-[#080b12] px-3 py-2 text-sm text-gray-100"
                      placeholder="Mission Control"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Content (optional)</label>
                  <textarea
                    value={formState.content}
                    onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))}
                    className="mt-1 h-40 w-full rounded-2xl border border-border/60 bg-[#05070c] px-3 py-2 font-mono text-sm text-gray-100"
                    placeholder="# Heading..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    YAML header (last_updated, updated_by) จะถูกเติมให้อัตโนมัติ
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" className="rounded-2xl border border-border/60 px-4 py-2 text-sm text-gray-300" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-2xl border border-accent-cyan/50 bg-accent-cyan/10 px-5 py-2 text-sm font-semibold text-accent-cyan">
                    {saving ? "Saving..." : "Create"}
                  </button>
                </div>
              </form>
            )}

            {(modal.mode === "view" || modal.mode === "edit") && modal.content !== null && !modalLoading && (
              <div className="mt-4">
                {modal.mode === "view" ? (
                  <KnowledgeViewer content={modal.content} metadata={modal.file.metadata} filename={modal.file.filename} />
                ) : (
                  <KnowledgeEditor
                    filename={modal.file.filename}
                    initialContent={modal.content}
                    metadata={modal.file.metadata}
                    onCancel={() => setModal(null)}
                    onSave={async (nextContent) => {
                      await handleSaveEdit(nextContent, modal.file);
                    }}
                  />
                )}
              </div>
            )}

            {modalLoading && <div className="py-10 text-center text-sm text-gray-400">กำลังโหลด...</div>}
          </div>
        </div>
      )}
    </div>
  );
}
