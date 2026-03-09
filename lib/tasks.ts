export const TASK_STATUSES = ["pending", "in-progress", "completed", "blocked"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskRecord {
  id: string;
  title: string;
  status: TaskStatus;
  agent?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedReason?: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus);
}

export function normalizeTaskRecord(record: any): TaskRecord {
  const now = new Date().toISOString();
  const status = isTaskStatus(record?.status)
    ? record.status
    : record?.completed === true
      ? "completed"
      : "pending";

  return {
    id: String(record?.id || Date.now()),
    title: String(record?.title || "").trim(),
    status,
    agent: typeof record?.agent === "string" && record.agent.trim() ? record.agent.trim().toUpperCase() : undefined,
    createdAt: typeof record?.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record?.updatedAt === "string" ? record.updatedAt : now,
    completedAt:
      typeof record?.completedAt === "string"
        ? record.completedAt
        : status === "completed"
          ? typeof record?.updatedAt === "string"
            ? record.updatedAt
            : now
          : undefined,
    blockedReason:
      typeof record?.blockedReason === "string" && record.blockedReason.trim()
        ? record.blockedReason.trim()
        : undefined,
  };
}

export function validateTaskCreateInput(body: any) {
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    throw new Error("Title is required");
  }

  if (body.status !== undefined && !isTaskStatus(body.status)) {
    throw new Error("Invalid status");
  }

  return {
    title: body.title.trim(),
    agent:
      typeof body.agent === "string" && body.agent.trim()
        ? body.agent.trim().toUpperCase()
        : undefined,
    status: isTaskStatus(body.status) ? body.status : ("pending" as TaskStatus),
    blockedReason:
      typeof body.blockedReason === "string" && body.blockedReason.trim()
        ? body.blockedReason.trim()
        : undefined,
  };
}

export function validateTaskUpdateInput(body: any) {
  const updates: Partial<Pick<TaskRecord, "title" | "status" | "agent" | "blockedReason">> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("Title must be a non-empty string");
    }
    updates.title = body.title.trim();
  }

  if (body.status !== undefined) {
    if (!isTaskStatus(body.status)) {
      throw new Error("Invalid status");
    }
    updates.status = body.status;
  }

  if (body.agent !== undefined) {
    updates.agent =
      typeof body.agent === "string" && body.agent.trim()
        ? body.agent.trim().toUpperCase()
        : undefined;
  }

  if (body.blockedReason !== undefined) {
    if (body.blockedReason === null || body.blockedReason === "") {
      updates.blockedReason = undefined;
    } else if (typeof body.blockedReason === "string") {
      updates.blockedReason = body.blockedReason.trim() || undefined;
    } else {
      throw new Error("Blocked reason must be a string");
    }
  }

  return updates;
}

export function applyTaskUpdates(task: TaskRecord, updates: Partial<Pick<TaskRecord, "title" | "status" | "agent" | "blockedReason">>): TaskRecord {
  const nextStatus = updates.status ?? task.status;
  const updatedAt = new Date().toISOString();

  return {
    ...task,
    ...updates,
    status: nextStatus,
    blockedReason:
      nextStatus === "blocked"
        ? updates.blockedReason ?? task.blockedReason
        : updates.blockedReason === undefined
          ? undefined
          : updates.blockedReason,
    completedAt:
      nextStatus === "completed"
        ? task.completedAt || updatedAt
        : undefined,
    updatedAt,
  };
}
