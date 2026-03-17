"use client";

import { useMemo, useState } from "react";
import type { AgentOverview, PriorityLevel, TaskRecord } from "@/types/task";
import { PRIORITY_LEVELS } from "@/types/task";
import TaskCard from "@/components/task-card";
import { bucketizeTasks } from "@/lib/task-utils";
import KnowledgeWorkspace from "@/components/knowledge-workspace";

interface AgentDetailPanelProps {
  agent?: AgentOverview;
  tasks: TaskRecord[];
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const TABS = [
  { id: "tasks", label: "Tasks" },
  { id: "knowledge", label: "Knowledge" },
  { id: "info", label: "Agent Info" },
] as const;

const PRIORITY_ORDER: PriorityLevel[] = ["CRITICAL", "P1", "P2", "P3", "P4"];

function getHigherPriority(current: PriorityLevel) {
  const index = PRIORITY_ORDER.indexOf(current);
  return index <= 0 ? current : PRIORITY_ORDER[index - 1];
}

export default function AgentDetailPanel({ agent, tasks, open, onClose, onRefresh }: AgentDetailPanelProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("tasks");
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const buckets = useMemo(() => bucketizeTasks(tasks), [tasks]);

  const completedStats = useMemo(() => {
    return buckets.completed.reduce(
      (acc, task) => {
        const totalTokens = task.tokenUsage?.total ?? 0;
        const totalCost = task.estimatedCostThb ?? 0;
        return {
          tokens: acc.tokens + (Number.isNaN(totalTokens) ? 0 : totalTokens),
          cost: acc.cost + (Number.isNaN(totalCost) ? 0 : totalCost),
        };
      },
      { tokens: 0, cost: 0 }
    );
  }, [buckets.completed]);

  const formatTokenTotal = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  if (!agent || !open) {
    return null;
  }

  const handlePromote = async (task: TaskRecord) => {
    const next = getHigherPriority(task.priority);
    if (next === task.priority) {
      setFeedback("ค่านี้สูงสุดแล้ว");
      return;
    }
    await updateTask(task.id, { priority: next });
  };

  const handleCancel = async (task: TaskRecord) => {
    if (!confirm(`ยกเลิก ${task.title}?`)) return;
    await updateTask(task.id, { status: "cancelled" });
  };

  const handleReassign = async (task: TaskRecord) => {
    const target = window.prompt("ย้ายให้ agent ไหน? (เช่น blueprint)", task.agent);
    if (!target) return;
    await updateTask(task.id, { agent: target.toLowerCase() });
  };

  const handleApproveReview = async (task: TaskRecord) => {
    await updateTask(task.id, {
      status: "completed",
      reviewedBy: "manual_panel",
      reviewedAt: new Date().toISOString(),
      autoComplete: false,
    });
  };

  const handleRequestChanges = async (task: TaskRecord) => {
    await updateTask(task.id, {
      status: "in_progress",
      reviewedBy: null,
      reviewedAt: null,
    });
  };

  const handleResumeBlocked = async (task: TaskRecord) => {
    await updateTask(task.id, { status: "in_progress" });
  };

  const updateTask = async (id: string, updates: Record<string, unknown>) => {
    try {
      setBusyTask(id);
      setFeedback(null);
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "อัปเดตไม่สำเร็จ");
      }
      setFeedback("อัปเดตแล้ว");
      onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setBusyTask(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        className="relative z-10 flex h-[90vh] w-full max-w-6xl flex-col rounded-3xl border border-border/70 bg-[#05070b] p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-500">{agent.label}</div>
            <div className="mt-1 text-3xl text-white">{agent.icon} Snapshot</div>
            <p className="text-sm text-gray-400">คิว {agent.queueCount} | Model {agent.model}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/60 px-3 py-1 text-sm text-gray-400 transition hover:border-accent-cyan/40 hover:text-white"
          >
            ✕ ปิด
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold ${
                tab === item.id ? "border-accent-cyan/50 text-accent-cyan" : "border-border/60 text-gray-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-2">
          {tab === "tasks" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-[#0b131d] p-4">
                <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-accent-cyan/80">
                  🔄 IN PROGRESS ({buckets.inProgress.length})
                </div>
                <div className="mt-3 space-y-3">
                  {buckets.inProgress.length === 0 && <p className="text-sm text-gray-500">ยังไม่มี</p>}
                  {buckets.inProgress.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      variant="inProgress"
                      showActions
                      onReassign={handleReassign}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-[#101821] p-4">
                <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-emerald-300/80">
                  🔍 PENDING REVIEW ({buckets.pendingReview.length})
                </div>
                <div className="mt-3 space-y-3">
                  {buckets.pendingReview.length === 0 && <p className="text-sm text-gray-500">ไม่มีงานค้างรีวิว</p>}
                  {buckets.pendingReview.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-border/40 bg-[#070b12] p-3">
                      <TaskCard task={task} variant="pendingReview" />
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleApproveReview(task)}
                          className="rounded-full border border-accent-green/40 px-3 py-1 text-accent-green transition hover:bg-accent-green/10"
                        >
                          ✅ Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestChanges(task)}
                          className="rounded-full border border-amber-500/40 px-3 py-1 text-amber-200 transition hover:bg-amber-500/10"
                        >
                          ↺ ส่งกลับ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-[#1a1015] p-4">
                <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-red-200/80">
                  🚧 BLOCKED ({buckets.blocked.length})
                </div>
                <div className="mt-3 space-y-3">
                  {buckets.blocked.length === 0 && <p className="text-sm text-gray-500">ไม่มีงานติดขัด</p>}
                  {buckets.blocked.map((task) => (
                    <div key={task.id} className="space-y-2 rounded-2xl border border-border/40 bg-[#140a0f] p-3">
                      <TaskCard
                        task={task}
                        variant="blocked"
                        showActions
                        onReassign={handleReassign}
                        onCancel={handleCancel}
                      />
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleResumeBlocked(task)}
                          className="rounded-full border border-accent-cyan/40 px-3 py-1 text-accent-cyan transition hover:bg-accent-cyan/10"
                        >
                          🔄 กลับไปทำต่อ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-[#151515] p-4">
                <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-amber-200/80">
                  📋 IN QUEUE ({buckets.queued.length})
                </div>
                <div className="mt-3 space-y-3">
                  {buckets.queued.length === 0 && <p className="text-sm text-gray-500">ไม่มีคิวค้าง</p>}
                  {buckets.queued.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      variant="queued"
                      showActions
                      onPromote={handlePromote}
                      onReassign={handleReassign}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-[#10130f] p-4 xl:col-span-2">
                <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-accent-green/80">
                  ✅ COMPLETED ({buckets.completed.length})
                </div>
                {(completedStats.tokens > 0 || completedStats.cost > 0) && (
                  <div className="mt-1 text-xs text-gray-400">
                    {completedStats.tokens > 0 && (
                      <span>🔤 {formatTokenTotal(completedStats.tokens)} tokens</span>
                    )}
                    {completedStats.cost > 0 && (
                      <span>
                        {completedStats.tokens > 0 && " · "}
                        💰 ฿{completedStats.cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 space-y-3">
                  {buckets.completed.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีรายการ</p>}
                  {buckets.completed.map((task) => (
                    <TaskCard key={task.id} task={task} variant="completed" />
                  ))}
                </div>
              </div>
            </div>
          )}

        {tab === "knowledge" && (
          <div className="mt-6">
            <KnowledgeWorkspace layout="panel" />
          </div>
        )}

        {tab === "info" && (
          <div className="mt-6 space-y-4 text-sm text-gray-300">
            <div className="rounded-2xl border border-border/60 bg-[#0c1118] p-4">
              <div>สถานะ: {agent.statusEmoji} {agent.status}</div>
              <div>Session: {agent.sessionTime}</div>
              <div>Last active: {agent.lastActive}</div>
              <div>Dispatch: {agent.dispatchStatusLabel}</div>
            </div>
          </div>
        )}
        </div>

        {busyTask && <p className="mt-4 text-xs text-gray-500">กำลังอัปเดต task...</p>}
        {feedback && <p className="mt-2 text-sm text-gray-300">{feedback}</p>}
      </div>
    </div>
  );
}
