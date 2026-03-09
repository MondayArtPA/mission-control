import { NextRequest, NextResponse } from "next/server";
import {
  readExpenses,
  toErrorResponse,
  updateExpenseRecord,
  validateExpenseUpdateInput,
  writeExpenses,
} from "@/lib/expenses";

// GET /api/expenses/[id] - Get single expense
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenses = await readExpenses();
    const expense = expenses.find((item) => item.id === id);

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to fetch expense");
    return NextResponse.json(response.body, { status: response.status });
  }
}

// PUT /api/expenses/[id] - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates = validateExpenseUpdateInput(body);

    const expenses = await readExpenses();
    const expenseIndex = expenses.findIndex((item) => item.id === id);

    if (expenseIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    const updatedExpense = updateExpenseRecord(expenses[expenseIndex], updates);
    expenses[expenseIndex] = updatedExpense;
    await writeExpenses(expenses);

    return NextResponse.json({ success: true, data: updatedExpense });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to update expense");
    return NextResponse.json(response.body, { status: response.status });
  }
}

// DELETE /api/expenses/[id] - Delete single expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenses = await readExpenses();
    const filteredExpenses = expenses.filter((item) => item.id !== id);

    if (filteredExpenses.length === expenses.length) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    await writeExpenses(filteredExpenses);
    return NextResponse.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    const response = toErrorResponse(error, "Failed to delete expense");
    return NextResponse.json(response.body, { status: response.status });
  }
}
