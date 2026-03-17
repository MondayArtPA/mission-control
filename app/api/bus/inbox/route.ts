import { NextRequest, NextResponse } from "next/server";
import { getInbox, markRead } from "@/lib/bus-store";
import { isValidAgent } from "@/lib/agent-status";
import type { AgentName } from "@/types/task";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get("agent");

    if (!agent || !isValidAgent(agent)) {
      return NextResponse.json({ success: false, error: "Valid agent name required (?agent=monday)" }, { status: 400 });
    }

    const messages = await getInbox(agent as AgentName);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to read inbox" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, agent } = body ?? {};

    if (!messageId || !agent || !isValidAgent(agent)) {
      return NextResponse.json({ success: false, error: "messageId and valid agent required" }, { status: 400 });
    }

    await markRead(messageId, agent as AgentName);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to mark read" },
      { status: 500 }
    );
  }
}
