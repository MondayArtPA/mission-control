import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeFile, softDeleteKnowledgeFile, updateKnowledgeFile } from "@/lib/knowledge-store";
import type { KnowledgeMetadata } from "@/types/knowledge";

const buildFilename = (raw: string | string[]) => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return decodeURIComponent(value ?? "");
};

export async function GET(_request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = buildFilename(params.filename);
    const record = await getKnowledgeFile(filename);
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่พบไฟล์";
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = buildFilename(params.filename);
    const body = await request.json();
    const { content, metadata, verifyAfterDays, verifyAfterDate, approved } = body ?? {};

    const metaUpdates: Partial<KnowledgeMetadata> = { ...(metadata ?? {}) };
    if (typeof approved === "boolean") {
      metaUpdates.approved = approved;
    }
    if (typeof verifyAfterDate === "string") {
      metaUpdates.verify_after = verifyAfterDate;
    }

    if (content === undefined && !metaUpdates.verify_after && typeof verifyAfterDays !== "number" && Object.keys(metaUpdates).length === 0) {
      return NextResponse.json({ success: false, error: "ไม่มีข้อมูลให้แก้ไข" }, { status: 400 });
    }

    const record = await updateKnowledgeFile(filename, {
      content,
      metadata: Object.keys(metaUpdates).length ? metaUpdates : undefined,
      verifyAfterDays: typeof verifyAfterDays === "number" ? verifyAfterDays : undefined,
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = buildFilename(params.filename);
    await softDeleteKnowledgeFile(filename);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบไฟล์ไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
