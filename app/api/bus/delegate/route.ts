import { NextRequest, NextResponse } from "next/server";
import { createDelegation, getDelegations, updateDelegation } from "@/lib/bus-store";
import { isValidAgent } from "@/lib/agent-status";
import type { AgentName } from "@/types/task";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, title, detail, priority, parentTaskId } = body ?? {};

    if (!from || !isValidAgent(from)) {
      return NextResponse.json({ success: false, error: "Valid 'from' agent required" }, { status: 400 });
    }
    if (!to || !isValidAgent(to)) {
      return NextResponse.json({ success: false, error: "Valid 'to' agent required" }, { status: 400 });
    }
    if (!title || typeof title !== "string") {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const record = await createDelegation({
      from: from as AgentName,
      to: to as AgentName,
      title,
      detail: detail || "",
      priority: priority || "normal",
      parentTaskId,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create delegation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get("agent") || undefined;
    const status = searchParams.get("status") || undefined;

    const validAgent = agent && isValidAgent(agent) ? (agent as AgentName) : undefined;
    const records = await getDelegations(validAgent, status);
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get delegations" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, result } = body ?? {};

    if (!id) {
      return NextResponse.json({ success: false, error: "Delegation id required" }, { status: 400 });
    }

    const completedAt = status === "completed" || status === "rejected" ? new Date().toISOString() : undefined;
    const updated = await updateDelegation(id, { status, result, completedAt });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Delegation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update delegation" },
      { status: 500 }
    );
  }
}
