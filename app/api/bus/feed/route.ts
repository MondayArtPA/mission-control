import { NextRequest, NextResponse } from "next/server";
import { getBusFeed } from "@/lib/bus-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10), 5), 100);

    const feed = await getBusFeed(limit);
    return NextResponse.json({ success: true, data: feed });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get feed" },
      { status: 500 }
    );
  }
}
