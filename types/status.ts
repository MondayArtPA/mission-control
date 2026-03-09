import type { ExpenseBreakdownWithShare, ExpenseBudgetStatus } from "./expenses";

export interface ExpenseStatusBadge {
  level: ExpenseBudgetStatus;
  emoji: string;
  label: string;
  message: string;
  palette: "emerald" | "amber" | "orange" | "red";
}

export interface ExpenseStatusSnapshot {
  month: string;
  currency: string;
  spent: number;
  remaining: number;
  budget: number;
  usagePct: number;
  status: ExpenseBudgetStatus;
  thresholds: {
    alert: number;
    restrict: number;
    budget: number;
  };
  badge: ExpenseStatusBadge;
  breakdownByAgent: ExpenseBreakdownWithShare[];
  link: {
    label: string;
    href: string;
  };
  updatedAt: string;
}

export interface TodoStatusSnapshot {
  total: number;
  active: number;
  blocked: number;
  completed: number;
  lastUpdated: string | null;
}

export interface EventStatusSnapshot {
  total: number;
  lastEventAt: string | null;
}

export interface MissionControlStatusPayload {
  timestamp: string;
  polling: {
    intervalSeconds: number;
  };
  expenses: ExpenseStatusSnapshot;
  todos: TodoStatusSnapshot;
  events: EventStatusSnapshot;
}
