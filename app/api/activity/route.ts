import { NextRequest, NextResponse } from "next/server";
import { appendActivityEvent, readActivityLog } from "@/lib/activity-logger";
import type { ActivityEvent } from "@/types/task";
import { isValidAgent } from "@/lib/agent-status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(100, Math.max(5, Number(limitParam))) : 25;
    const events = await readActivityLog(limit);
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load activity" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, type, message, priority } = body ?? {};
    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    let eventSource: ActivityEvent["source"] = "art";
    if (typeof source === "string") {
      if (source === "art") {
        eventSource = "art";
      } else if (isValidAgent(source)) {
        eventSource = source;
      }
    }

    const event = await appendActivityEvent({
      source: eventSource,
      type: type ?? "note",
      message,
      priority,
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to write activity" },
      { status: 400 }
    );
  }
}
