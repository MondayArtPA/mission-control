import { NextRequest, NextResponse } from "next/server";
import { searchKnowledgeFiles } from "@/lib/knowledge-store";
import type { KnowledgePrefix } from "@/types/knowledge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const prefixParam = searchParams.get("prefix") as KnowledgePrefix | null;
    const updatedBy = searchParams.get("updatedBy") ?? undefined;

    const filters = {
      prefix: prefixParam && ["sys", "dec", "run", "misc"].includes(prefixParam) ? prefixParam : undefined,
      updatedBy: updatedBy?.trim() || undefined,
    } as const;

    const results = await searchKnowledgeFiles(query, filters);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ค้นหาไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
