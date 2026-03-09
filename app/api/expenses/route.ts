import { NextRequest, NextResponse } from "next/server";
import {
  createExpense,
  readExpenses,
  toErrorResponse,
  validateExpenseInput,
  writeExpenses,
} from "@/lib/expenses";

// GET /api/expenses - Get all expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const category = searchParams.get("category");

    let expenses = await readExpenses();

    if (month) {
      expenses = expenses.filter((expense) => expense.date.startsWith(month));
    }

    if (category) {
      const normalizedCategory = category.trim().toLowerCase();
      expenses = expenses.filter(
        (expense) => expense.category.toLowerCase() === normalizedCategory
      );
    }

    expenses.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to fetch expenses");
    return NextResponse.json(response.body, { status: response.status });
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = validateExpenseInput(body);

    const expenses = await readExpenses();
    const newExpense = createExpense(input);

    expenses.push(newExpense);
    await writeExpenses(expenses);

    return NextResponse.json({ success: true, data: newExpense }, { status: 201 });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to create expense");
    return NextResponse.json(response.body, { status: response.status });
  }
}

// DELETE /api/expenses - Delete all expenses
export async function DELETE() {
  try {
    await writeExpenses([]);
    return NextResponse.json({ success: true, message: "All expenses deleted" });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to delete expenses");
    return NextResponse.json(response.body, { status: response.status });
  }
}
