import { NextResponse } from "next/server";

const examples = {
  createExpense: {
    method: "POST",
    url: "/api/expenses",
    body: {
      title: "Team lunch",
      amount: 850.5,
      category: "Food",
      date: "2026-03-09T12:30:00.000Z",
      notes: "Client follow-up lunch",
    },
  },
  updateExpense: {
    method: "PUT",
    url: "/api/expenses/:id",
    body: {
      amount: 920,
      notes: "Added parking",
    },
  },
  monthlySummary: {
    method: "GET",
    url: "/api/expenses/summary?month=2026-03",
  },
};

// GET /api/expenses/examples - Get request examples
export async function GET() {
  return NextResponse.json({ success: true, data: examples });
}
