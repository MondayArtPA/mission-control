import type { AgentName, PriorityLevel, TaskRecord } from "@/types/task";

export function groupTasksByAgent(tasks: TaskRecord[]): Record<AgentName, TaskRecord[]> {
  return tasks.reduce<Record<string, TaskRecord[]>>((acc, task) => {
    if (!acc[task.agent]) {
      acc[task.agent] = [];
    }
    acc[task.agent].push(task);
    return acc;
  }, {}) as Record<AgentName, TaskRecord[]>;
}

const PRIORITY_ORDER: PriorityLevel[] = ["CRITICAL", "P1", "P2", "P3", "P4"];

function priorityWeight(priority: PriorityLevel): number {
  const index = PRIORITY_ORDER.indexOf(priority);
  return index === -1 ? PRIORITY_ORDER.length : index;
}

function toTimestamp(value?: string | null, fallback?: string | null): number {
  if (value) {
    const ts = new Date(value).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  if (fallback) {
    const fallbackTs = new Date(fallback).getTime();
    if (!Number.isNaN(fallbackTs)) return fallbackTs;
  }
  return 0;
}

export function bucketizeTasks(tasks: TaskRecord[]) {
  const inProgress = tasks
    .filter((task) => task.status === "in_progress")
    .sort((a, b) => toTimestamp(a.startedAt, a.createdAt) - toTimestamp(b.startedAt, b.createdAt));

  const queued = tasks
    .filter((task) => task.status === "queued" || task.status === "new")
    .sort((a, b) => {
      const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
    });

  const pendingReview = tasks
    .filter((task) => task.status === "pending_review")
    .sort((a, b) => toTimestamp(a.updatedAt, a.startedAt) - toTimestamp(b.updatedAt, b.startedAt));

  const blocked = tasks
    .filter((task) => task.status === "blocked")
    .sort((a, b) => toTimestamp(a.updatedAt, a.startedAt) - toTimestamp(b.updatedAt, b.startedAt));

  const completed = tasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => toTimestamp(b.completedAt, b.updatedAt) - toTimestamp(a.completedAt, a.updatedAt));

  return {
    inProgress,
    queued,
    pendingReview,
    blocked,
    completed,
  };
}
