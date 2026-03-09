import { NextResponse } from "next/server";
import { buildExpenseMetricsSummary } from "@/lib/expense-metrics";
import { readTodos, type Todo } from "@/app/api/todos/route";
import { readEvents, writeEvents, type Event } from "@/app/api/events/route";
import { readSystemStatusState, writeSystemStatusState, type SystemStatusState } from "@/lib/system-status";
import type { ExpenseBudgetStatus, ExpenseSummaryApiPayload } from "@/types/expenses";
import type {
  EventStatusSnapshot,
  ExpenseStatusBadge,
  ExpenseStatusSnapshot,
  MissionControlStatusPayload,
  TodoStatusSnapshot,
} from "@/types/status";

const STATUS_RANK: Record<ExpenseBudgetStatus, number> = {
  normal: 0,
  alert: 1,
  restrict: 2,
  over: 3,
};

const STATUS_BADGES: Record<ExpenseBudgetStatus, ExpenseStatusBadge> = {
  normal: {
    level: "normal",
    emoji: "🟢",
    label: "Normal",
    message: "Spend is comfortably under control",
    palette: "emerald",
  },
  alert: {
    level: "alert",
    emoji: "🟡",
    label: "Alert",
    message: "80% budget warning line crossed",
    palette: "amber",
  },
  restrict: {
    level: "restrict",
    emoji: "🟠",
    label: "Restrict",
    message: "93% restrict threshold hit — slow spend",
    palette: "orange",
  },
  over: {
    level: "over",
    emoji: "🔴",
    label: "Over",
    message: "Budget ceiling exceeded",
    palette: "red",
  },
};

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

export async function GET() {
  try {
    const now = new Date();

    const [summary, todos, events, state] = await Promise.all([
      buildExpenseMetricsSummary(),
      readTodos(),
      readEvents(),
      readSystemStatusState(),
    ]);

    const expensesSnapshot = buildExpenseSnapshot(summary, now);
    const nextState = await maybeEmitExpenseThresholdEvent(state, expensesSnapshot, events);
    const todoSnapshot = buildTodoSnapshot(todos);
    const eventSnapshot = buildEventSnapshot(events);

    nextState.updatedAt = now.toISOString();
    await writeSystemStatusState(nextState);

    const payload: MissionControlStatusPayload = {
      timestamp: now.toISOString(),
      polling: { intervalSeconds: 5 },
      expenses: expensesSnapshot,
      todos: todoSnapshot,
      events: eventSnapshot,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("[status] Failed to build mission status", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mission status" },
      { status: 500 },
    );
  }
}

function buildExpenseSnapshot(summary: ExpenseSummaryApiPayload, now: Date): ExpenseStatusSnapshot {
  const metrics = summary.metrics;
  const totals = metrics?.totals;
  const status: ExpenseBudgetStatus = totals?.status ?? "normal";
  const badge = STATUS_BADGES[status];

  return {
    month: summary.month,
    currency: metrics?.currency ?? "THB",
    spent: totals?.spent ?? 0,
    remaining: Math.max(totals?.remaining ?? 0, 0),
    budget: totals?.budget ?? 0,
    usagePct: totals?.usagePct ?? 0,
    status,
    thresholds: {
      alert: totals?.alertThreshold ?? 0,
      restrict: totals?.restrictThreshold ?? 0,
      budget: totals?.budget ?? 0,
    },
    badge,
    breakdownByAgent: metrics?.breakdown?.byAgent ?? [],
    link: {
      label: "Open expense dashboard",
      href: "/expenses",
    },
    updatedAt: now.toISOString(),
  };
}

function buildTodoSnapshot(todos: Todo[]): TodoStatusSnapshot {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.status === "completed").length;
  const blocked = todos.filter((todo) => todo.status === "blocked").length;
  const active = total - completed;
  const lastUpdated = todos.reduce<string | null>((latest, todo) => {
    if (!todo.updatedAt) return latest;
    if (!latest || new Date(todo.updatedAt) > new Date(latest)) {
      return todo.updatedAt;
    }
    return latest;
  }, null);

  return {
    total,
    active,
    blocked,
    completed,
    lastUpdated,
  };
}

function buildEventSnapshot(events: Event[]): EventStatusSnapshot {
  const total = events.length;
  const lastEventAt = events.reduce<string | null>((latest, event) => {
    if (!event.timestamp) return latest;
    if (!latest || new Date(event.timestamp) > new Date(latest)) {
      return event.timestamp;
    }
    return latest;
  }, null);

  return { total, lastEventAt };
}

async function maybeEmitExpenseThresholdEvent(
  state: SystemStatusState,
  expenses: ExpenseStatusSnapshot,
  events: Event[],
): Promise<SystemStatusState> {
  const previous = state.expense;
  const previousMonth = previous?.month;
  let previousStatus: ExpenseBudgetStatus = previous?.lastStatus ?? "normal";

  if (!previousMonth || previousMonth !== expenses.month) {
    previousStatus = "normal";
  }

  const prevRank = STATUS_RANK[previousStatus];
  const currentRank = STATUS_RANK[expenses.status];

  if (currentRank > prevRank && expenses.status !== "normal") {
    const newEvent = buildExpenseStatusEvent(expenses);
    events.push(newEvent);
    await writeEvents(events);
    return {
      ...state,
      expense: {
        month: expenses.month,
        lastStatus: expenses.status,
        lastEventTimestamp: newEvent.timestamp,
      },
    };
  }

  return {
    ...state,
    expense: {
      month: expenses.month,
      lastStatus: expenses.status,
      lastEventTimestamp: previous?.lastEventTimestamp,
    },
  };
}

function buildExpenseStatusEvent(expenses: ExpenseStatusSnapshot): Event {
  const severity = expenses.status === "alert" ? "warning" : "critical";
  const threshold =
    expenses.status === "alert"
      ? expenses.thresholds.alert
      : expenses.status === "restrict"
        ? expenses.thresholds.restrict
        : expenses.thresholds.budget;

  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    agent: "SYSTEM",
    type: "notification",
    message: `${expenses.badge.label} budget state — ${THB.format(expenses.spent)} / ${THB.format(expenses.budget)} (${expenses.usagePct.toFixed(1)}%)`,
    metadata: {
      severity,
      category: "expenses",
      status: expenses.status,
      usagePct: expenses.usagePct,
      spent: expenses.spent,
      budget: expenses.budget,
      remaining: expenses.remaining,
      threshold,
      link: expenses.link.href,
    },
  };
}
