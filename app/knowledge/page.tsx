"use client";

import AppShell from "@/components/AppShell";
import KnowledgeWorkspace from "@/components/knowledge-workspace";

export default function KnowledgePage() {
  return (
    <AppShell
      eyebrow="Knowledge Layer"
      title="Knowledge Base"
      description="จัดการ sys/dec/run files จาก Mission Control — view, edit, verify, approve"
    >
      <KnowledgeWorkspace layout="page" />
    </AppShell>
  );
}
