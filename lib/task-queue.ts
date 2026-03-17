import fs from "fs/promises";
import path from "path";
import type { AgentName, PriorityLevel, TaskRecord, TaskStatus, TaskTokenUsage } from "@/types/task";
import { AGENT_DIRECTORY, PRIORITY_LEVELS } from "@/types/task";

const TASK_QUEUE_FILE = path.join(process.cwd(), "data", "task-queue.json");

interface TaskQueueFile {
  tasks: TaskRecord[];
}

const ALLOWED_STATUSES: TaskStatus[] = [
  "new",
  "queued",
  "in_progress",
  "pending_review",
  "blocked",
  "parked",
  "completed",
  "cancelled",
  "aborted",
];

const QUEUED_ALIASES = new Set(["new", "queued"]);

function ensurePriority(priority: string): PriorityLevel {
  const normalized = priority?.toUpperCase?.() ?? "P2";
  if (PRIORITY_LEVELS.includes(normalized as PriorityLevel)) {
    return normalized as PriorityLevel;
  }
  return "P2";
}

function ensureStatus(status: string): TaskStatus {
  const normalized = typeof status === "string" ? status.toLowerCase() : "queued";
  if (ALLOWED_STATUSES.includes(normalized as TaskStatus)) {
    return normalized as TaskStatus;
  }
  if (normalized === "new" || normalized === "queued") {
    return "queued";
  }
  return "queued";
}

function normalizeTokenUsage(value: any): TaskTokenUsage | null {
  if (!value || typeof value !== "object") return null;
  const input = Number(value.input ?? value.inputTokens ?? value.input_tokens ?? 0);
  const output = Number(value.output ?? value.outputTokens ?? value.output_tokens ?? 0);
  const total = value.total !== undefined ? Number(value.total) : input + output;
  if ([input, output, total].some((num) => Number.isNaN(num) || num < 0)) {
    return null;
  }
  return { input, output, total };
}

function normalizeTask(record: any): TaskRecord {
  const now = new Date().toISOString();
  const status = ensureStatus(record?.status ?? record?.state ?? "queued");
  return {
    id: String(record?.id ?? `task-${Date.now()}`),
    agent: (record?.agent || "monday").toLowerCase() as AgentName,
    priority: ensurePriority(record?.priority ?? "P2"),
    status,
    title: String(record?.title ?? "Untitled task").trim(),
    description: record?.description ? String(record.description).trim() : undefined,
    createdAt: record?.createdAt ?? now,
    updatedAt: record?.updatedAt ?? now,
    startedAt: record?.startedAt ?? null,
    completedAt: record?.completedAt ?? null,
    resultSummary: record?.resultSummary ?? null,
    attachments: Array.isArray(record?.attachments) ? record.attachments : [],
    dispatched: Boolean(record?.dispatched),
    dispatchedAt: record?.dispatchedAt ?? record?.dispatched_at ?? null,
    dispatchMessageId:
      typeof record?.dispatchMessageId === "number"
        ? record.dispatchMessageId
        : typeof record?.telegram_message_id === "number"
          ? record.telegram_message_id
          : null,
    dispatchError: record?.dispatchError ?? record?.dispatch_error ?? null,
    autoComplete:
      typeof record?.autoComplete === "boolean"
        ? record.autoComplete
        : typeof record?.auto_complete === "boolean"
          ? record.auto_complete
          : false,
    reviewMessageId: record?.reviewMessageId ?? record?.review_message_id ?? null,
    reviewedBy: record?.reviewedBy ?? record?.reviewed_by ?? null,
    reviewedAt: record?.reviewedAt ?? record?.reviewed_at ?? null,
    tokenUsage: normalizeTokenUsage(record?.tokenUsage ?? record?.token_usage),
    estimatedCostThb:
      record?.estimatedCostThb !== undefined || record?.estimated_cost_thb !== undefined
        ? Number(record?.estimatedCostThb ?? record?.estimated_cost_thb ?? 0)
        : null,
    modelUsed: record?.modelUsed ?? record?.model_used ?? null,
  };
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(TASK_QUEUE_FILE);
  } catch {
    await fs.mkdir(path.dirname(TASK_QUEUE_FILE), { recursive: true });
    const payload: TaskQueueFile = { tasks: [] };
    await fs.writeFile(TASK_QUEUE_FILE, JSON.stringify(payload, null, 2));
  }
}

async function readQueueFile(): Promise<TaskQueueFile> {
  await ensureFile();
  const raw = await fs.readFile(TASK_QUEUE_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks.map(normalizeTask) : [];
    return { tasks };
  } catch {
    return { tasks: [] };
  }
}

async function writeQueueFile(data: TaskQueueFile): Promise<void> {
  await ensureFile();
  await fs.writeFile(TASK_QUEUE_FILE, JSON.stringify(data, null, 2));
}

export async function readTaskQueue(): Promise<TaskRecord[]> {
  const data = await readQueueFile();
  return data.tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface CreateTaskInput {
  agent: AgentName;
  title: string;
  description?: string;
  priority: PriorityLevel;
}

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
  if (!input.title.trim()) {
    throw new Error("Task title is required");
  }

  if (!AGENT_DIRECTORY[input.agent]) {
    throw new Error("Invalid agent");
  }

  const data = await readQueueFile();
  const now = new Date().toISOString();
  const task: TaskRecord = {
    id: `task-${Date.now()}`,
    agent: input.agent,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    priority: input.priority,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    resultSummary: null,
    attachments: [],
    dispatched: false,
    dispatchedAt: null,
    dispatchMessageId: null,
    dispatchError: null,
    autoComplete: false,
    reviewMessageId: null,
    reviewedBy: null,
    reviewedAt: null,
    tokenUsage: null,
    estimatedCostThb: null,
    modelUsed: null,
  };

  data.tasks.push(task);
  await writeQueueFile(data);
  return task;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: PriorityLevel;
  status?: TaskStatus;
  agent?: AgentName;
  startedAt?: string | null;
  completedAt?: string | null;
  resultSummary?: string | null;
  dispatched?: boolean;
  dispatchedAt?: string | null;
  dispatchMessageId?: number | null;
  dispatchError?: string | null;
  autoComplete?: boolean;
  reviewMessageId?: string | number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  tokenUsage?: TaskTokenUsage | null;
  estimatedCostThb?: number | null;
  modelUsed?: string | null;
}

export async function updateTask(id: string, updates: UpdateTaskInput): Promise<TaskRecord> {
  const data = await readQueueFile();
  const index = data.tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    throw new Error("Task not found");
  }

  const current = data.tasks[index];
  const now = new Date().toISOString();
  const nextStatus = updates.status ?? current.status;
  const shouldCaptureStart =
    !current.startedAt && ["in_progress", "pending_review", "blocked"].includes(nextStatus);
  const startedAt = shouldCaptureStart ? now : current.startedAt ?? null;

  let completedAt = current.completedAt ?? null;
  if (nextStatus === "completed" || nextStatus === "cancelled") {
    completedAt = now;
  } else if (nextStatus !== current.status && completedAt) {
    completedAt = null;
  }

  const nextTokenUsage =
    updates.tokenUsage !== undefined
      ? updates.tokenUsage === null
        ? null
        : normalizeTokenUsage(updates.tokenUsage) ?? current.tokenUsage ?? null
      : current.tokenUsage ?? null;

  const nextReviewedBy = updates.reviewedBy ?? current.reviewedBy ?? null;
  const nextReviewedAt =
    updates.reviewedAt !== undefined
      ? updates.reviewedAt
      : updates.reviewedBy && !current.reviewedAt
        ? now
        : current.reviewedAt ?? null;

  const nextEstimatedCost =
    updates.estimatedCostThb !== undefined
      ? updates.estimatedCostThb === null
        ? null
        : Number(updates.estimatedCostThb)
      : current.estimatedCostThb ?? null;

  const next: TaskRecord = {
    ...current,
    title: updates.title?.trim() || current.title,
    description: updates.description !== undefined ? updates.description?.trim() : current.description,
    priority: updates.priority ?? current.priority,
    status: nextStatus,
    agent: updates.agent ?? current.agent,
    resultSummary: updates.resultSummary ?? current.resultSummary,
    dispatched: updates.dispatched ?? current.dispatched,
    dispatchedAt: updates.dispatchedAt !== undefined ? updates.dispatchedAt : current.dispatchedAt,
    dispatchMessageId:
      updates.dispatchMessageId !== undefined ? updates.dispatchMessageId : current.dispatchMessageId,
    dispatchError: updates.dispatchError !== undefined ? updates.dispatchError : current.dispatchError,
    updatedAt: now,
    startedAt,
    completedAt,
    autoComplete: updates.autoComplete ?? current.autoComplete ?? false,
    reviewMessageId:
      updates.reviewMessageId !== undefined ? updates.reviewMessageId : current.reviewMessageId ?? null,
    reviewedBy: nextReviewedBy,
    reviewedAt: nextReviewedAt,
    tokenUsage: nextTokenUsage,
    estimatedCostThb: nextEstimatedCost,
    modelUsed: updates.modelUsed !== undefined ? updates.modelUsed : current.modelUsed ?? null,
  };

  data.tasks[index] = next;
  await writeQueueFile(data);
  return next;
}

export async function deleteTask(id: string): Promise<void> {
  const data = await readQueueFile();
  const nextTasks = data.tasks.filter((task) => task.id !== id);
  await writeQueueFile({ tasks: nextTasks });
}

