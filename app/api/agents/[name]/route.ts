import { NextResponse } from "next/server";
import { getAgentDetailSnapshot, isValidAgent } from "@/lib/agent-status";

export async function GET(_: Request, { params }: { params: { name: string } }) {
  try {
    if (!params?.name || !isValidAgent(params.name)) {
      return NextResponse.json({ success: false, error: "Invalid agent" }, { status: 400 });
    }
    const snapshot = await getAgentDetailSnapshot(params.name);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch agent" },
      { status: 500 }
    );
  }
}
