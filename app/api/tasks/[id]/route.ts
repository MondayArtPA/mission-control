import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/task-queue";
import type { AgentName, PriorityLevel, TaskStatus } from "@/types/task";
import { PRIORITY_LEVELS } from "@/types/task";
import { appendActivityEvent } from "@/lib/activity-logger";
import { isValidAgent } from "@/lib/agent-status";

const VALID_STATUSES: TaskStatus[] = ["queued", "in_progress", "completed", "cancelled"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
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

    const task = await updateTask(params.id, updates);

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

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteTask(params.id);
    await appendActivityEvent({
      source: "system",
      type: "task_updated",
      message: `ลบ task ${params.id}`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete task" },
      { status: 400 }
    );
  }
}
