import { NextRequest, NextResponse } from "next/server";
import { buildExpenseBreakdownResponse, ExpenseMetricsError } from "@/lib/expense-metrics";

// GET /api/expenses/by-agent?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;
    const breakdown = await buildExpenseBreakdownResponse("agent", month);

    return NextResponse.json({ success: true, data: breakdown });
  } catch (error) {
    const response = toMetricsErrorResponse(error, "Failed to fetch agent expense breakdown");
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
