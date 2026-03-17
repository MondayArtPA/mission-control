import type { AgentDetailSnapshot, AgentName, AgentOverview, TaskRecord } from "@/types/task";
import { AGENT_DIRECTORY, AGENT_LIST } from "@/types/task";
import { readTaskQueue } from "@/lib/task-queue";
import { groupTasksByAgent, bucketizeTasks } from "@/lib/task-utils";

function formatDurationSince(iso?: string | null): string {
  if (!iso) return "—";
  const start = new Date(iso).getTime();
  const diffMs = Date.now() - start;
  if (Number.isNaN(diffMs) || diffMs < 0) return "—";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "< 1 นาที";
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${remainingMinutes} นาที`;
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "—";
  const diffMs = Date.now() - target;
  if (diffMs < 0) return "ตอนนี้";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

function determineStatus(
  inProgress: number,
  queued: number,
  pendingReview: number,
  blocked: number
): { status: AgentOverview["status"]; emoji: string } {
  const active = inProgress + pendingReview;
  const waiting = queued + blocked;
  if (active > 0 && waiting > 0) return { status: "busy", emoji: "🟠" };
  if (active > 0) return { status: "active", emoji: "🟢" };
  if (waiting > 0) return { status: "busy", emoji: "🟠" };
  return { status: "idle", emoji: "⚪" };
}

function countPriorities(tasks: TaskRecord[]) {
  const base = {
    critical: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
  };

  return tasks.reduce((acc, task) => {
    switch (task.priority) {
      case "CRITICAL":
        acc.critical += 1;
        break;
      case "P1":
        acc.p1 += 1;
        break;
      case "P2":
        acc.p2 += 1;
        break;
      case "P3":
        acc.p3 += 1;
        break;
      case "P4":
        acc.p4 += 1;
        break;
      default:
        break;
    }
    return acc;
  }, base);
}

export async function getAgentOverviews(): Promise<AgentOverview[]> {
  const tasks = await readTaskQueue();
  const grouped = groupTasksByAgent(tasks);

  return AGENT_LIST.map((profile) => {
    const agentTasks = grouped[profile.id] ?? [];
    const { inProgress, queued, pendingReview, blocked, completed } = bucketizeTasks(agentTasks);
    const { status, emoji } = determineStatus(
      inProgress.length,
      queued.length,
      pendingReview.length,
      blocked.length
    );
    const currentTask =
      inProgress[0]?.title ??
      pendingReview[0]?.title ??
      blocked[0]?.title ??
      queued[0]?.title ??
      "ยังไม่มี task";

    const sessionTime = inProgress[0]?.startedAt
      ? formatDurationSince(inProgress[0].startedAt)
      : pendingReview[0]?.startedAt
        ? formatDurationSince(pendingReview[0].startedAt)
        : "—";
    const lastActive = completed[0]?.completedAt ? formatRelativeTime(completed[0].completedAt) : "ยังไม่เคยทำ";

    const dispatchPendingCount = queued.filter((task) => !task.dispatched).length;
    const dispatchFailedCount = queued.filter((task) => Boolean(task.dispatchError)).length;
    const lastDispatchAt = agentTasks
      .map((task) => task.dispatchedAt)
      .filter((value): value is string => typeof value === "string" && Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    let dispatchStatus: AgentOverview["dispatchStatus"] = "idle";
    let dispatchStatusLabel = "—";

    if (dispatchFailedCount > 0) {
      dispatchStatus = "failed";
      dispatchStatusLabel = `⚠️ Dispatch failed (${dispatchFailedCount})`;
    } else if (dispatchPendingCount > 0) {
      dispatchStatus = "pending";
      dispatchStatusLabel = `⌛ Waiting dispatch (${dispatchPendingCount})`;
    } else if (queued.length + inProgress.length + pendingReview.length + blocked.length > 0) {
      dispatchStatus = "sent";
      dispatchStatusLabel = lastDispatchAt ? `📤 Sent ${formatRelativeTime(lastDispatchAt)}` : "📤 Sent";
    }

    return {
      id: profile.id,
      label: profile.label,
      icon: profile.icon,
      status,
      statusEmoji: emoji,
      currentTask,
      queueCount: queued.length + inProgress.length + pendingReview.length + blocked.length,
      model: profile.defaultModel,
      sessionTime,
      lastActive,
      priorityLoad: countPriorities(
        agentTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled")
      ),
      dispatchStatus,
      dispatchStatusLabel,
      dispatchPendingCount,
      dispatchFailedCount,
      lastDispatchAt,
    } satisfies AgentOverview;
  });
}

export async function getAgentDetailSnapshot(agentId: AgentName): Promise<AgentDetailSnapshot> {
  const overviews = await getAgentOverviews();
  const overview = overviews.find((agent) => agent.id === agentId);
  if (!overview) {
    throw new Error("Agent not found");
  }
  const tasks = (await readTaskQueue()).filter((task) => task.agent === agentId);
  return { overview, tasks };
}

export function isValidAgent(value: string): value is AgentName {
  if (!value) return false;
  const key = value.toLowerCase() as AgentName;
  return Boolean(AGENT_DIRECTORY[key]);
}
