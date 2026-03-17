import { NextRequest, NextResponse } from "next/server";
import { deleteTask, readTaskQueue, updateTask } from "@/lib/task-queue";
import type { AgentName, PriorityLevel, TaskRecord, TaskStatus } from "@/types/task";
import { PRIORITY_LEVELS } from "@/types/task";
import { appendActivityEvent } from "@/lib/activity-logger";
import { isValidAgent } from "@/lib/agent-status";
import { broadcastTaskUpdate } from "@/lib/stream-broadcast";

const VALID_STATUSES: TaskStatus[] = [
  "queued",
  "in_progress",
  "pending_review",
  "blocked",
  "parked",
  "completed",
  "cancelled",
  "aborted",
];

// P2: Status Lifecycle - Cancel/Abort/Park/Resume logic
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action; // "cancel" | "abort" | "park" | "resume"

    // Handle special actions
    if (action === "cancel") {
      return handleCancel(id);
    }
    if (action === "abort") {
      return handleAbort(id, body.reason);
    }
    if (action === "park") {
      return handlePark(id, body.reason);
    }
    if (action === "resume") {
      return handleResume(id);
    }

    // Standard field updates
    const updates: any = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ success: false, error: "Title must not be empty" }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description = typeof body.description === "string" ? body.description : undefined;
    }

    if (body.priority && PRIORITY_LEVELS.includes(body.priority)) {
      updates.priority = body.priority as PriorityLevel;
    }

    if (body.status && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status as TaskStatus;
    }

    if (body.agent && isValidAgent(body.agent)) {
      updates.agent = body.agent.toLowerCase() as AgentName;
    }

    if (body.resultSummary !== undefined) {
      updates.resultSummary = body.resultSummary;
    }

    const task = await updateTask(id, updates);

    // P5: Broadcast task update
    broadcastTaskUpdate(id, task);

    await appendActivityEvent({
      source: task.agent,
      type: "task_updated",
      message: `อัปเดต ${task.title}`,
      priority: task.priority,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update task" },
      { status: 400 }
    );
  }
}

// P2: Cancel - only allowed for queued tasks
async function handleCancel(id: string) {
  const tasks = await readTaskQueue();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
  }

  if (task.status !== "queued") {
    return NextResponse.json(
      { success: false, error: "Can only cancel queued tasks" },
      { status: 400 }
    );
  }

  const updated = await updateTask(id, { status: "cancelled" });

  // P5: Broadcast update
  broadcastTaskUpdate(id, updated);

  await appendActivityEvent({
    source: "system",
    type: "task_updated",
    message: `❌ Cancelled: ${task.title}`,
    priority: task.priority,
  });

  return NextResponse.json({ success: true, data: updated, meta: { action: "cancelled" } });
}

// P2: Abort - check impact and warn
async function handleAbort(id: string, reason?: string) {
  const tasks = await readTaskQueue();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
  }

  // Check if task is in progress - aborting has impact
  const inProgressStatuses = ["in_progress", "pending_review", "blocked"];
  const hasImpact = inProgressStatuses.includes(task.status);

  // If has impact and no reason provided, warn but still allow
  if (hasImpact && !reason) {
    // Return warning but allow abort anyway
    const updated = await updateTask(id, { status: "aborted", resultSummary: "Aborted without reason" });

    // P5: Broadcast update
    broadcastTaskUpdate(id, updated);

    await appendActivityEvent({
      source: "system",
      type: "task_updated",
      message: `⚠️ Aborted (no reason): ${task.title}`,
      priority: task.priority,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      meta: { action: "aborted", warning: "Task was in progress - may have incomplete work" },
    });
  }

  const resultSummary = reason ? `Aborted: ${reason}` : "Aborted";
  const updated = await updateTask(id, { status: "aborted", resultSummary });

  // P5: Broadcast update
  broadcastTaskUpdate(id, updated);

  await appendActivityEvent({
    source: "system",
    type: "task_updated",
    message: `🛑 Aborted${reason ? `: ${reason}` : ""} — ${task.title}`,
    priority: task.priority,
  });

  return NextResponse.json({
    success: true,
    data: updated,
    meta: { action: "aborted" },
  });
}

// P2: Park - for interrupts
async function handlePark(id: string, reason?: string) {
  const tasks = await readTaskQueue();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
  }

  const parkableStatuses = ["queued", "in_progress"];
  if (!parkableStatuses.includes(task.status)) {
    return NextResponse.json(
      { success: false, error: "Can only park queued or in_progress tasks" },
      { status: 400 }
    );
  }

  const resultSummary = reason ? `Parked: ${reason}` : "Parked for interrupt";
  const updated = await updateTask(id, { status: "parked", resultSummary });

  // P5: Broadcast update
  broadcastTaskUpdate(id, updated);

  await appendActivityEvent({
    source: "system",
    type: "task_updated",
    message: `⏸️ Parked${reason ? `: ${reason}` : ""} — ${task.title}`,
    priority: task.priority,
  });

  return NextResponse.json({ success: true, data: updated, meta: { action: "parked" } });
}

// P2: Resume - continue from park
async function handleResume(id: string) {
  const tasks = await readTaskQueue();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
  }

  if (task.status !== "parked") {
    return NextResponse.json(
      { success: false, error: "Can only resume parked tasks" },
      { status: 400 }
    );
  }

  const updated = await updateTask(id, { status: "in_progress", resultSummary: null });

  // P5: Broadcast update
  broadcastTaskUpdate(id, updated);

  await appendActivityEvent({
    source: task.agent,
    type: "task_updated",
    message: `▶️ Resumed: ${task.title}`,
    priority: task.priority,
  });

  return NextResponse.json({ success: true, data: updated, meta: { action: "resumed" } });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTask(id);
    await appendActivityEvent({
      source: "system",
      type: "task_updated",
      message: `ลบ task ${id}`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete task" },
      { status: 400 }
    );
  }
}
