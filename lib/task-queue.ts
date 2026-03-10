import fs from "fs/promises";
import path from "path";
import type { AgentName, PriorityLevel, TaskRecord, TaskStatus } from "@/types/task";
import { AGENT_DIRECTORY, PRIORITY_LEVELS } from "@/types/task";

const TASK_QUEUE_FILE = path.join(process.cwd(), "data", "task-queue.json");

interface TaskQueueFile {
  tasks: TaskRecord[];
}

function ensurePriority(priority: string): PriorityLevel {
  const normalized = priority.toUpperCase();
  if (PRIORITY_LEVELS.includes(normalized as PriorityLevel)) {
    return normalized as PriorityLevel;
  }
  return "P2";
}

function ensureStatus(status: string): TaskStatus {
  const allowed: TaskStatus[] = ["queued", "in_progress", "completed", "cancelled"];
  return allowed.includes(status as TaskStatus) ? (status as TaskStatus) : "queued";
}

function normalizeTask(record: any): TaskRecord {
  const now = new Date().toISOString();
  return {
    id: String(record?.id ?? `task-${Date.now()}`),
    agent: (record?.agent || "monday").toLowerCase() as AgentName,
    priority: ensurePriority(record?.priority ?? "P2"),
    status: ensureStatus(record?.status ?? "queued"),
    title: String(record?.title ?? "Untitled task").trim(),
    description: record?.description ? String(record.description).trim() : undefined,
    createdAt: record?.createdAt ?? now,
    updatedAt: record?.updatedAt ?? now,
    startedAt: record?.startedAt ?? null,
    completedAt: record?.completedAt ?? null,
    resultSummary: record?.resultSummary ?? null,
    attachments: Array.isArray(record?.attachments) ? record.attachments : [],
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
  resultSummary?: string | null;
}

export async function updateTask(id: string, updates: UpdateTaskInput): Promise<TaskRecord> {
  const data = await readQueueFile();
  const index = data.tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    throw new Error("Task not found");
  }

  const current = data.tasks[index];
  const now = new Date().toISOString();

  const next: TaskRecord = {
    ...current,
    title: updates.title?.trim() || current.title,
    description: updates.description !== undefined ? updates.description?.trim() : current.description,
    priority: updates.priority ?? current.priority,
    status: updates.status ?? current.status,
    agent: updates.agent ?? current.agent,
    resultSummary: updates.resultSummary ?? current.resultSummary,
    updatedAt: now,
    startedAt: updates.status === "in_progress" && !current.startedAt ? now : current.startedAt,
    completedAt: updates.status === "completed" ? now : updates.status === "cancelled" ? now : current.completedAt,
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

