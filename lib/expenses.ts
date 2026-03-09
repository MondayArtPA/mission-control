import fs from "fs/promises";
import path from "path";
import {
  Expense,
  ExpenseInput,
  ExpenseUpdateInput,
  MonthlyExpenseSummary,
} from "@/types/expenses";

const DATA_FILE = path.join(process.cwd(), "data", "expenses.json");

class ExpenseValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExpenseValidationError";
    this.status = status;
  }
}

async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);

  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function readExpenses(): Promise<Expense[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeExpenses(expenses: Expense[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(expenses, null, 2));
}

function normalizeString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ExpenseValidationError(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ExpenseValidationError(`${fieldName} is required`);
  }

  return trimmed;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ExpenseValidationError("Notes must be a string");
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ExpenseValidationError("Amount must be a valid number");
  }

  if (value < 0) {
    throw new ExpenseValidationError("Amount must be greater than or equal to 0");
  }

  return Math.round(value * 100) / 100;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new ExpenseValidationError("Date is required");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ExpenseValidationError("Date is required");
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ExpenseValidationError("Date must be a valid ISO 8601 date string");
  }

  return parsed.toISOString();
}

export function validateExpenseInput(body: unknown): ExpenseInput {
  if (!body || typeof body !== "object") {
    throw new ExpenseValidationError("Request body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  return {
    title: normalizeString(payload.title, "Title"),
    amount: normalizeAmount(payload.amount),
    category: normalizeString(payload.category, "Category"),
    date: normalizeDate(payload.date),
    notes: normalizeOptionalString(payload.notes),
  };
}

export function validateExpenseUpdateInput(body: unknown): ExpenseUpdateInput {
  if (!body || typeof body !== "object") {
    throw new ExpenseValidationError("Request body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  const updates: ExpenseUpdateInput = {};

  if (payload.title !== undefined) {
    updates.title = normalizeString(payload.title, "Title");
  }

  if (payload.amount !== undefined) {
    updates.amount = normalizeAmount(payload.amount);
  }

  if (payload.category !== undefined) {
    updates.category = normalizeString(payload.category, "Category");
  }

  if (payload.date !== undefined) {
    updates.date = normalizeDate(payload.date);
  }

  if (payload.notes !== undefined) {
    updates.notes = normalizeOptionalString(payload.notes);
  }

  if (Object.keys(updates).length === 0) {
    throw new ExpenseValidationError("At least one field is required to update");
  }

  return updates;
}

export function createExpense(input: ExpenseInput): Expense {
  const now = new Date().toISOString();

  return {
    id: Date.now().toString(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateExpenseRecord(
  existingExpense: Expense,
  updates: ExpenseUpdateInput
): Expense {
  return {
    ...existingExpense,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

export function getMonthRange(month: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ExpenseValidationError("Month must use YYYY-MM format");
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new ExpenseValidationError("Month must use YYYY-MM format");
  }

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

export function buildMonthlySummary(
  expenses: Expense[],
  month: string
): MonthlyExpenseSummary {
  const { start, end } = getMonthRange(month);

  const monthExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate < end;
  });

  const categoryMap = new Map<string, { total: number; count: number }>();

  for (const expense of monthExpenses) {
    const current = categoryMap.get(expense.category) ?? { total: 0, count: 0 };
    current.total += expense.amount;
    current.count += 1;
    categoryMap.set(expense.category, current);
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      total: Math.round(stats.total * 100) / 100,
      count: stats.count,
    }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  const totalExpense =
    Math.round(
      monthExpenses.reduce((sum, expense) => sum + expense.amount, 0) * 100
    ) / 100;

  return {
    month,
    totalExpense,
    count: monthExpenses.length,
    categoryBreakdown,
  };
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ExpenseValidationError) {
    return {
      body: { success: false, error: error.message },
      status: error.status,
    };
  }

  return {
    body: { success: false, error: fallbackMessage },
    status: 500,
  };
}
