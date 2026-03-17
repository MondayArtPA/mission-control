import { NextRequest, NextResponse } from "next/server";
import { shareKnowledge, searchKnowledge } from "@/lib/bus-store";
import { isValidAgent } from "@/lib/agent-status";
import type { AgentName } from "@/types/task";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { author, topic, tags, content } = body ?? {};

    if (!author || !isValidAgent(author)) {
      return NextResponse.json({ success: false, error: "Valid author agent required" }, { status: 400 });
    }
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ success: false, error: "Topic is required" }, { status: 400 });
    }
    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    const entry = await shareKnowledge({
      author: author as AgentName,
      topic,
      tags: Array.isArray(tags) ? tags : [],
      content,
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to share knowledge" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : undefined;

    const entries = await searchKnowledge(query, tags);
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to search knowledge" },
      { status: 500 }
    );
  }
}
