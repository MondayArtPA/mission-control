"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  CircleDollarSign,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseInput } from "@/types/expenses";

const CATEGORY_PRESETS = [
  "Food",
  "Transport",
  "Software",
  "Business",
  "Bills",
  "Health",
  "Shopping",
  "Other",
];

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function ExpenseSection() {
  const { summary, month, loading, submitting, error, setMonth, addExpense, refreshExpenses, recentExpenses } = useExpenses();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [date, setDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState("");

  const averageSpend = useMemo(() => {
    if (!summary || summary.count === 0) return 0;
    return summary.totalExpense / summary.count;
  }, [summary]);

  const topCategory = summary?.categoryBreakdown[0];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !amount.trim()) return;

    const payload: ExpenseInput = {
      title: title.trim(),
      amount: Number(amount),
      category,
      date: new Date(`${date}T12:00:00`).toISOString(),
      notes: notes.trim() || undefined,
    };

    await addExpense(payload);
    setTitle("");
    setAmount("");
    setCategory(CATEGORY_PRESETS[0]);
    setDate(getTodayInputValue());
    setNotes("");
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-accent-green" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Expense Radar
            </h2>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              {formatMonthLabel(month)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-[#1a1a1a] border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent-green"
          />
          <button
            onClick={refreshExpenses}
            className="p-2 rounded border border-border bg-[#1a1a1a] hover:border-accent-green/60 hover:text-accent-green transition-colors"
            title="Refresh expenses"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-border bg-[#151515] p-3">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-gray-500">
            <CircleDollarSign size={14} className="text-accent-green" />
            Total Spend
          </div>
          <div className="text-2xl font-bold font-mono text-accent-green">
            {formatCurrency(summary?.totalExpense ?? 0)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-[#151515] p-3">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-gray-500">
            <ReceiptText size={14} className="text-accent-cyan" />
            Entries
          </div>
          <div className="text-2xl font-bold font-mono">
            {summary?.count ?? 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-border bg-[#151515] p-3">
          <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500 mb-1">
            Avg / Expense
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {formatCurrency(averageSpend)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-[#151515] p-3">
          <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500 mb-1">
            Top Category
          </div>
          <div className="text-sm font-semibold text-accent-amber truncate">
            {topCategory?.category ?? "—"}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">
            {topCategory ? `${formatCurrency(topCategory.total)} • ${topCategory.count} items` : "No spend this month"}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500 mb-2">
          Category Breakdown
        </div>
        <div className="space-y-2">
          {loading && !summary ? (
            <div className="flex items-center justify-center py-4 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : summary?.categoryBreakdown.length ? (
            summary.categoryBreakdown.slice(0, 4).map((item) => {
              const ratio = summary.totalExpense > 0 ? (item.total / summary.totalExpense) * 100 : 0;
              return (
                <div key={item.category} className="rounded-lg border border-border bg-[#151515] p-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono mb-2">
                    <span className="truncate text-foreground">{item.category}</span>
                    <span className="text-gray-500">{formatCurrency(item.total)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-accent-green to-accent-cyan"
                      style={{ width: `${Math.max(ratio, 6)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono flex justify-between">
                    <span>{item.count} items</span>
                    <span>{ratio.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-[#151515] p-4 text-center text-xs text-gray-500">
              No expenses logged for this month yet.
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500">
            Recent Expenses
          </div>
          <div className="text-[11px] font-mono text-gray-600">
            {recentExpenses.length} shown
          </div>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {recentExpenses.length > 0 ? recentExpenses.map((expense) => (
            <div
              key={expense.id}
              className="rounded-lg border border-border bg-[#151515] p-2.5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{expense.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-gray-500 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                    {expense.category}
                  </span>
                  <span>{formatDisplayDate(expense.date)}</span>
                </div>
                {expense.notes && (
                  <div className="text-xs text-gray-400 mt-1 truncate">{expense.notes}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold font-mono text-accent-green">
                  {formatCurrency(expense.amount)}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1 flex items-center gap-1 justify-end">
                  <ArrowDownRight size={11} /> outflow
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-border bg-[#151515] p-4 text-center text-xs text-gray-500">
              Recent expenses will show up here once you log one.
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border pt-4 space-y-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Plus size={14} className="text-accent-amber" />
          <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500">
            Quick Add Expense
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What did you spend on?"
          className="w-full bg-[#1a1a1a] border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-green transition-colors"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="bg-[#1a1a1a] border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-green transition-colors"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#1a1a1a] border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-green transition-colors"
          >
            {CATEGORY_PRESETS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[#1a1a1a] border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-green transition-colors"
          />
          <button
            type="submit"
            disabled={submitting || !title.trim() || !amount.trim()}
            className="px-3 py-2 bg-accent-green hover:bg-accent-green/80 text-background font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Expense
          </button>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note"
          rows={2}
          className="w-full bg-[#1a1a1a] border border-border rounded px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:border-accent-green transition-colors"
        />
      </form>
    </div>
  );
}
