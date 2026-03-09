export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export interface ExpenseUpdateInput {
  title?: string;
  amount?: number;
  category?: string;
  date?: string;
  notes?: string;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

export interface MonthlyExpenseSummary {
  month: string;
  totalExpense: number;
  count: number;
  categoryBreakdown: CategoryBreakdown[];
}
