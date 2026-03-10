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

export type ExpenseBudgetStatus = "normal" | "alert" | "restrict" | "over";

export interface ExpenseBreakdownWithShare extends ExpenseBreakdownItem {
  percent: number;
}

export interface ExpenseTrendPoint {
  date: string;
  total: number;
  cumulative: number;
}

export interface ExpenseMissionControlMetrics {
  currency: string;
  totals: {
    budget: number;
    alertThreshold: number;
    restrictThreshold: number;
    spent: number;
    remaining: number;
    usagePct: number;
    status: ExpenseBudgetStatus;
  };
  counts: {
    entries: number;
    daysWithSpend: number;
    filesScanned: number;
    ignoredEntries: number;
  };
  trend: {
    daily: ExpenseTrendPoint[];
  };
  logs: {
    daysProcessed: string[];
    missingDays: string[];
  };
  breakdown: {
    byCategory: ExpenseBreakdownWithShare[];
    byAgent: ExpenseBreakdownWithShare[];
    byModel: ExpenseBreakdownWithShare[];
  };
}

export interface TokenUsageGroup {
  key: string;
  input: number;
  output: number;
  total: number;
}

export interface TokenUsageSummary {
  totals: TokenUsageGroup;
  byProvider: TokenUsageGroup[];
  byAgent: TokenUsageGroup[];
}


export interface OpenRouterActualSummary {
  monthLabel: string;
  trackedThb: number;
  trackedUsd: number;
  actualThb: number | null;
  actualUsd: number | null;
  gapThb: number | null;
  gapPct: number | null;
  status: "ok" | "missing" | "error";
  message?: string;
  updatedAt?: string | null;
}

export type ExpenseSummaryApiPayload = MonthlyExpenseSummary & {
  metrics: ExpenseMissionControlMetrics;
  tokenUsage: TokenUsageSummary;
  openrouterActual: OpenRouterActualSummary;
};

export interface ExpenseBreakdownResponse {
  month: string;
  currency: string;
  total: number;
  breakdown: ExpenseBreakdownWithShare[];
  stats: {
    entries: number;
    filesScanned: number;
    ignoredEntries: number;
  };
}
