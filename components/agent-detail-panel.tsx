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
  { id: "queue", label: "Task Queue" },
  { id: "knowledge", label: "Knowledge" },
  { id: "info", label: "Agent Info" },
  { id: "history", label: "History" },
] as const;

const PRIORITY_ORDER: PriorityLevel[] = ["CRITICAL", "P1", "P2", "P3", "P4"];

function getHigherPriority(current: PriorityLevel) {
  const index = PRIORITY_ORDER.indexOf(current);
  return index <= 0 ? current : PRIORITY_ORDER[index - 1];
}

export default function AgentDetailPanel({ agent, tasks, open, onClose, onRefresh }: AgentDetailPanelProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("queue");
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const buckets = useMemo(() => bucketizeTasks(tasks), [tasks]);

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
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-border/60 bg-[#05070b] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-500">{agent.label}</div>
            <div className="mt-1 text-2xl text-white">{agent.icon} Snapshot</div>
            <p className="text-sm text-gray-400">คิว {agent.queueCount} | Model {agent.model}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/60 px-3 py-1 text-sm text-gray-400 hover:text-white"
          >
            ปิด
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

        {tab === "queue" && (
          <div className="mt-6 space-y-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-gray-500">กำลังทำ</div>
              <div className="mt-3 space-y-3">
                {buckets.inProgress.length === 0 && <p className="text-sm text-gray-500">ยังไม่มี</p>}
                {buckets.inProgress.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showActions
                    onReassign={handleReassign}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-gray-500">รอคิว</div>
              <div className="mt-3 space-y-3">
                {buckets.queued.length === 0 && <p className="text-sm text-gray-500">ไม่มีคิวค้าง</p>}
                {buckets.queued.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showActions
                    onPromote={handlePromote}
                    onReassign={handleReassign}
                    onCancel={handleCancel}
                  />
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
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="mt-6 space-y-3">
            {buckets.completed.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีรายการ</p>}
            {buckets.completed.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {busyTask && <p className="mt-4 text-xs text-gray-500">กำลังอัปเดต task...</p>}
        {feedback && <p className="mt-2 text-sm text-gray-300">{feedback}</p>}
      </div>
    </div>
  );
}
