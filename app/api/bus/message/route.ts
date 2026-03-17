import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/bus-store";
import { isValidAgent } from "@/lib/agent-status";
import type { AgentName } from "@/types/task";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, type, subject, body: msgBody, priority, replyTo, taskId } = body ?? {};

    if (!from || !isValidAgent(from)) {
      return NextResponse.json({ success: false, error: "Invalid 'from' agent" }, { status: 400 });
    }
    if (!to || (to !== "all" && !isValidAgent(to))) {
      return NextResponse.json({ success: false, error: "Invalid 'to' agent (use agent name or 'all')" }, { status: 400 });
    }
    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ success: false, error: "Subject is required" }, { status: 400 });
    }

    const msg = await sendMessage({
      from: from as AgentName,
      to: to as AgentName | "all",
      type: type || "message",
      subject,
      body: msgBody || "",
      priority: priority || "normal",
      replyTo,
      taskId,
    });

    return NextResponse.json({ success: true, data: msg }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
