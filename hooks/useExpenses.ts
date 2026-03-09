import { useCallback, useEffect, useMemo, useState } from "react";
import type { Expense, ExpenseInput, ExpenseSummaryApiPayload } from "@/types/expenses";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UseExpensesReturn {
  expenses: Expense[];
  summary: ExpenseSummaryApiPayload | null;
  month: string;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  setMonth: (month: string) => void;
  addExpense: (input: ExpenseInput) => Promise<void>;
  refreshExpenses: () => Promise<void>;
  recentExpenses: Expense[];
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function useExpenses(initialMonth = getCurrentMonth()): UseExpensesReturn {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryApiPayload | null>(null);
  const [month, setMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (targetMonth: string) => {
    try {
      setLoading(true);
      setError(null);

      const [expensesResponse, summaryResponse] = await Promise.all([
        fetch(`/api/expenses?month=${encodeURIComponent(targetMonth)}`),
        fetch(`/api/expenses/summary?month=${encodeURIComponent(targetMonth)}`),
      ]);

      const expensesData: ApiResponse<Expense[]> = await expensesResponse.json();
      const summaryData: ApiResponse<ExpenseSummaryApiPayload> = await summaryResponse.json();

      if (!expensesResponse.ok || !expensesData.success) {
        throw new Error(expensesData.error || "Failed to fetch expenses");
      }

      if (!summaryResponse.ok || !summaryData.success) {
        throw new Error(summaryData.error || "Failed to fetch expense summary");
      }

      setExpenses(expensesData.data ?? []);
      setSummary(summaryData.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const addExpense = useCallback(async (input: ExpenseInput) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: ApiResponse<Expense> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create expense");
      }

      await fetchExpenses(month);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchExpenses, month]);

  const refreshExpenses = useCallback(async () => {
    await fetchExpenses(month);
  }, [fetchExpenses, month]);

  useEffect(() => {
    fetchExpenses(month);
  }, [fetchExpenses, month]);

  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  return {
    expenses,
    summary,
    month,
    loading,
    submitting,
    error,
    setMonth,
    addExpense,
    refreshExpenses,
    recentExpenses,
  };
}
