import { NextRequest, NextResponse } from "next/server";
import { createKnowledgeFile, listKnowledgeFiles } from "@/lib/knowledge-store";
import type { KnowledgePrefix } from "@/types/knowledge";

const ALLOWED_PREFIXES: KnowledgePrefix[] = ["sys", "dec", "run"];

export async function GET() {
  try {
    const entries = await listKnowledgeFiles();
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load knowledge files";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prefix, name, title, content } = body ?? {};
    if (!prefix || !ALLOWED_PREFIXES.includes(prefix)) {
      return NextResponse.json({ success: false, error: "ต้องเลือก prefix sys/dec/run" }, { status: 400 });
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ success: false, error: "ต้องระบุชื่อไฟล์" }, { status: 400 });
    }

    const slug = name.trim();
    if (!slug) {
      return NextResponse.json({ success: false, error: "ต้องระบุชื่อไฟล์" }, { status: 400 });
    }

    const record = await createKnowledgeFile({ prefix, slug, title, content });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create knowledge file";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
