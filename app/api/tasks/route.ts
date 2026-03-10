import { NextRequest, NextResponse } from "next/server";
import { createTask, readTaskQueue } from "@/lib/task-queue";
import type { AgentName, PriorityLevel } from "@/types/task";
import { PRIORITY_LEVELS } from "@/types/task";
import { appendActivityEvent } from "@/lib/activity-logger";
import { isValidAgent } from "@/lib/agent-status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get("agent");
    const tasks = await readTaskQueue();

    const data = agent && isValidAgent(agent) ? tasks.filter((task) => task.agent === agent) : tasks;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, title, description, priority } = body ?? {};

    if (!agent || !isValidAgent(agent)) {
      return NextResponse.json({ success: false, error: "Invalid agent" }, { status: 400 });
    }
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Task title is required" }, { status: 400 });
    }

    const normalizedPriority = PRIORITY_LEVELS.includes(priority) ? (priority as PriorityLevel) : "P2";

    const normalizedAgent = agent.toLowerCase() as AgentName;
    const task = await createTask({
      agent: normalizedAgent,
      title,
      description,
      priority: normalizedPriority,
    });

    await appendActivityEvent({
      source: normalizedAgent,
      type: "task_created",
      message: `เพิ่ม task ใหม่: ${task.title}`,
      priority: normalizedPriority,
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
