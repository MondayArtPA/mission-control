import { NextRequest, NextResponse } from "next/server";
import { buildMonthlySummary, readExpenses, toErrorResponse } from "@/lib/expenses";

// GET /api/expenses/summary?month=2026-03 - Get monthly expense summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { success: false, error: "Month is required" },
        { status: 400 }
      );
    }

    const expenses = await readExpenses();
    const summary = buildMonthlySummary(expenses, month);

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to fetch expense summary");
    return NextResponse.json(response.body, { status: response.status });
  }
}
