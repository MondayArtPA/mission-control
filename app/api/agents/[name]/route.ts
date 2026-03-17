import { NextResponse } from "next/server";
import { getAgentDetailSnapshot, isValidAgent } from "@/lib/agent-status";

type RouteContext = {
  params: Promise<{ name: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { name } = await context.params;
    if (!name || !isValidAgent(name)) {
      return NextResponse.json({ success: false, error: "Invalid agent" }, { status: 400 });
    }
    const snapshot = await getAgentDetailSnapshot(name);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch agent" },
      { status: 500 }
    );
  }
}
