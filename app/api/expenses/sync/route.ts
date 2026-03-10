import { NextResponse } from "next/server";
import { syncProviderCosts } from "@/lib/provider-sync";

export async function POST() {
  try {
    const result = await syncProviderCosts();
    const allSkippedOrFailed = result.providers.every((provider) => provider.skipped || provider.error);
    const status = allSkippedOrFailed ? 207 : 200;

    return NextResponse.json({ success: !allSkippedOrFailed, data: result }, { status });
  } catch (error) {
    console.error("[provider-sync] Failed to sync provider costs", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync provider costs",
      },
      { status: 500 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
    },
    { status: 405 },
  );
}
