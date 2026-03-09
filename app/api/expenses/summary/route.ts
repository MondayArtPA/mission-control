import { NextRequest, NextResponse } from "next/server";
import { buildMonthlySummary, readExpenses, toErrorResponse } from "@/lib/expenses";

// GET /api/expenses/summary?month=2026-03 - Get monthly (or current MTD) expense summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get("month");
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const month = requestedMonth || currentMonth;

    const expenses = await readExpenses();
    const summary = buildMonthlySummary(expenses, month);

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to fetch expense summary");
    return NextResponse.json(response.body, { status: response.status });
  }
}
