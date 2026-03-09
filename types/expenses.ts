export interface ExpenseMetadata {
  model?: string;
  agent?: string;
  [key: string]: unknown;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  agent?: string;
  model?: string;
  metadata?: ExpenseMetadata;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  category: string;
  agent?: string;
  model?: string;
  metadata?: ExpenseMetadata;
  date: string;
  notes?: string;
}

export interface ExpenseUpdateInput {
  title?: string;
  amount?: number;
  category?: string;
  agent?: string;
  model?: string;
  metadata?: ExpenseMetadata;
  date?: string;
  notes?: string;
}

export interface ExpenseBreakdownItem {
  key: string;
  total: number;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

export interface MonthlyExpenseSummary {
  month: string;
  periodStart: string;
  periodEndExclusive: string;
  isMonthToDate: boolean;
  totalExpense: number;
  count: number;
  categoryBreakdown: CategoryBreakdown[];
  breakdown: {
    byAgent: ExpenseBreakdownItem[];
    byCategory: ExpenseBreakdownItem[];
    byModel: ExpenseBreakdownItem[];
  };
}
