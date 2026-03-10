"use client";

import { useMemo, useState } from "react";
import KnowledgeViewer from "@/components/knowledge-viewer";
import type { KnowledgeMetadata } from "@/types/knowledge";

interface KnowledgeEditorProps {
  filename: string;
  initialContent: string;
  metadata?: KnowledgeMetadata;
  onSave: (content: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function KnowledgeEditor({ filename, initialContent, metadata, onSave, onCancel }: KnowledgeEditorProps) {
  const [value, setValue] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => value !== initialContent, [value, initialContent]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold ${mode === "edit" ? "border-accent-cyan/40 text-accent-cyan" : "border-border/60 text-gray-400"}`}
          onClick={() => setMode("edit")}
        >
          Editor
        </button>
        <button
          type="button"
          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold ${mode === "preview" ? "border-accent-cyan/40 text-accent-cyan" : "border-border/60 text-gray-400"}`}
          onClick={() => setMode("preview")}
        >
          Preview
        </button>
      </div>

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-96 w-full rounded-2xl border border-border/70 bg-[#05070c] px-4 py-3 font-mono text-sm text-gray-100"
        />
      ) : (
        <KnowledgeViewer content={value} filename={filename} />
      )}

      <div className="flex justify-between text-xs text-gray-500">
        <p>บันทึกแล้วจะ update last_updated + updated_by อัตโนมัติ</p>
        {dirty && <p className="text-accent-cyan">มีการแก้ไขที่ยังไม่บันทึก</p>}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="rounded-2xl border border-border/60 px-4 py-2 text-sm text-gray-200" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl border border-accent-cyan/40 bg-accent-cyan/10 px-5 py-2 text-sm font-semibold text-accent-cyan"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
