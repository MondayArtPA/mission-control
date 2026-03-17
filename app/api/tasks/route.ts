import { NextRequest, NextResponse } from "next/server";
import { createTask, readTaskQueue, updateTask } from "@/lib/task-queue";
import type { AgentName, PriorityLevel } from "@/types/task";
import { PRIORITY_LEVELS } from "@/types/task";
import { appendActivityEvent } from "@/lib/activity-logger";
import { isValidAgent } from "@/lib/agent-status";
import { dispatchTaskToAgent } from "@/lib/telegram-dispatch";
import { triggerAgent } from "@/lib/agent-trigger";
import { autoRouteTask, getRecommendedPriority } from "@/lib/auto-route";
import { broadcastTaskCreated } from "@/lib/stream-broadcast";

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
    const { agent, title, description, priority, autoRoute } = body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Task title is required" }, { status: 400 });
    }

    // P4: Auto-routing logic
    let targetAgent: AgentName;
    let routingInfo: { confidence: number; reason: string } | undefined;

    if (autoRoute && (!agent || agent === "auto")) {
      // Auto-determine best agent
      const routeResult = autoRouteTask(title, description);
      targetAgent = routeResult.agent;
      routingInfo = { confidence: routeResult.confidence, reason: routeResult.reason };
    } else if (!agent || !isValidAgent(agent)) {
      return NextResponse.json({ success: false, error: "Invalid agent" }, { status: 400 });
    } else {
      targetAgent = agent.toLowerCase() as AgentName;
    }

    // Auto-detect priority if not specified
    let normalizedPriority: PriorityLevel;
    if (priority && PRIORITY_LEVELS.includes(priority)) {
      normalizedPriority = priority as PriorityLevel;
    } else if (autoRoute) {
      normalizedPriority = getRecommendedPriority(title, description);
    } else {
      normalizedPriority = "P2";
    }

    const task = await createTask({
      agent: targetAgent,
      title,
      description,
      priority: normalizedPriority,
    });

    // P5: Broadcast task created event
    broadcastTaskCreated(task);

    await appendActivityEvent({
      source: targetAgent,
      type: "task_created",
      message: `เพิ่ม task ใหม่: ${task.title}`,
      priority: normalizedPriority,
    });

    const dispatchResult = await dispatchTaskToAgent(task);
    let finalTask = task;

    if (dispatchResult.success) {
      finalTask = await updateTask(task.id, {
        dispatched: true,
        dispatchedAt: new Date().toISOString(),
        dispatchMessageId: dispatchResult.messageId ?? null,
        dispatchError: null,
      });

      await appendActivityEvent({
        source: targetAgent,
        type: "task_dispatched",
        message: `📤 ส่งงานให้ ${targetAgent.toUpperCase()} แล้ว: ${task.title}`,
        priority: normalizedPriority,
      });

      // Trigger agent to actually start working (not just Telegram notification)
      // First set status to in_progress, then wait for completion
      updateTask(task.id, { status: "in_progress", startedAt: new Date().toISOString() }).catch(() => {});
      triggerAgent(finalTask).then(async (triggerResult) => {
        if (triggerResult.success) {
          await updateTask(task.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            resultSummary: triggerResult.responseText?.slice(0, 500) || "Agent completed",
          });
          await appendActivityEvent({
            source: targetAgent,
            type: "task_completed",
            message: `✅ ${targetAgent.toUpperCase()} ทำงานเสร็จแล้ว: ${task.title}`,
            priority: normalizedPriority,
          });
        } else {
          await updateTask(task.id, {
            status: "aborted",
            completedAt: new Date().toISOString(),
            resultSummary: triggerResult.error?.slice(0, 300) || "Agent failed",
          });
          await appendActivityEvent({
            source: targetAgent,
            type: "trigger_failed",
            message: `⚠️ ${targetAgent.toUpperCase()} ทำงานไม่สำเร็จ: ${triggerResult.error?.slice(0, 100)}`,
            priority: normalizedPriority,
          });
        }
      }).catch(() => { /* non-blocking — don't fail the request */ });
    } else {
      finalTask = await updateTask(task.id, {
        dispatched: false,
        dispatchedAt: null,
        dispatchMessageId: null,
        dispatchError: dispatchResult.error ?? "Dispatch failed",
      });

      await appendActivityEvent({
        source: targetAgent,
        type: "dispatch_failed",
        message: `⚠️ ส่งงานให้ ${targetAgent.toUpperCase()} ไม่สำเร็จ: ${dispatchResult.error ?? "unknown error"}`,
        priority: normalizedPriority,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: finalTask,
        meta: {
          dispatched: dispatchResult.success,
          dispatchError: dispatchResult.success ? null : dispatchResult.error ?? null,
          autoRouted: !!routingInfo,
          routing: routingInfo,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
