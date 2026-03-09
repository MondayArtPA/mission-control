import { NextRequest, NextResponse } from "next/server";
import { buildExpenseMetricsSummary, ExpenseMetricsError } from "@/lib/expense-metrics";

// GET /api/expenses/summary?month=2026-03 - Mission Control expense metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;
    const summary = await buildExpenseMetricsSummary(month);

    console.log('[expense-summary] Response keys:', Object.keys(summary));
    console.log('[expense-summary] Has metrics?', 'metrics' in summary);
    console.log('[expense-summary] Entries count:', summary.metrics?.counts?.entries);

    // Debug: write to file
    const fs = await import('fs/promises');
    await fs.writeFile('/tmp/expense-debug.json', JSON.stringify(summary, null, 2));

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const response = toMetricsErrorResponse(error, "Failed to build expense metrics summary");
    return NextResponse.json(response.body, { status: response.status });
  }
}

function toMetricsErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ExpenseMetricsError) {
    return {
      body: { success: false, error: error.message },
      status: error.status,
    };
  }

  console.error("[expense-metrics] Unexpected error", error);
  return {
    body: { success: false, error: fallback },
    status: 500,
  };
}
