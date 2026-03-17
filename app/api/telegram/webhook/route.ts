import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import type { TaskRecord } from "@/types/task";
import { handleTelegramReply } from "@/lib/telegram-webhook";

const QUEUE_PATH = path.join(process.cwd(), "data", "task-queue.json");
const EVENTS_PATH = path.join(process.cwd(), "data", "events.json");

async function loadQueue(): Promise<{ tasks: TaskRecord[] }> {
  const raw = await fs.readFile(QUEUE_PATH, "utf-8");
  return JSON.parse(raw);
}

async function saveQueue(queue: { tasks: TaskRecord[] }) {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

interface ActivityEvent {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  message: string;
}

async function appendEvent(entry: ActivityEvent) {
  try {
    const raw = await fs.readFile(EVENTS_PATH, "utf-8");
    const events: ActivityEvent[] = JSON.parse(raw);
    events.unshift(entry);
    await fs.writeFile(EVENTS_PATH, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error("Failed to append activity event", error);
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const queue = await loadQueue();
  const result = handleTelegramReply(payload, queue.tasks);

  if (!result) {
    return NextResponse.json({ success: true, handled: false });
  }

  const targetTaskIndex = queue.tasks.findIndex((task) => task.id === result.task.id);
  if (targetTaskIndex === -1) {
    return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
  }

  const timestamp = new Date().toISOString();

  if (result.patch) {
    queue.tasks[targetTaskIndex] = {
      ...queue.tasks[targetTaskIndex],
      ...result.patch,
      updatedAt: timestamp,
      completedAt:
        result.patch.status === "completed"
          ? result.patch.completedAt ?? timestamp
          : queue.tasks[targetTaskIndex].completedAt ?? null,
    };

    await saveQueue(queue);

    await appendEvent({
      id: Date.now().toString(),
      timestamp,
      agent: result.reviewer ?? "Art",
      type: "task",
      message:
        result.decision === "approve"
          ? `✅ Approved ${result.task.title}`
          : `↺ Requested changes for ${result.task.title}`,
    });
  } else if (result.decision === "comment") {
    await appendEvent({
      id: Date.now().toString(),
      timestamp,
      agent: result.reviewer ?? "Art",
      type: "note",
      message: `💬 ${result.reviewer ?? "Art"}: ${result.rawMessage ?? ""}`,
    });
  }

  return NextResponse.json({ success: true, handled: true, decision: result.decision });
}
