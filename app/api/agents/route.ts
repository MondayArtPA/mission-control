import { NextResponse } from "next/server";
import { getAgentOverviews } from "@/lib/agent-status";

export async function GET() {
  try {
    const agents = await getAgentOverviews();
    return NextResponse.json({ success: true, data: agents });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
