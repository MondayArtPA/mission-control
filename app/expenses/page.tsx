"use client";

import AppShell from "@/components/AppShell";
import ExpenseSection from "@/components/ExpenseSection";
import { ArrowDownRight, CircleDollarSign, Wallet } from "lucide-react";

const expenseHighlights = [
  {
    label: "Dedicated Spend View",
    value: "Focused",
    icon: Wallet,
    color: "text-accent-green",
  },
  {
    label: "Monthly Monitoring",
    value: "Live",
    icon: CircleDollarSign,
    color: "text-accent-cyan",
  },
  {
    label: "Expense Logging",
    value: "Quick Add",
    icon: ArrowDownRight,
    color: "text-accent-amber",
  },
];

export default function ExpensesPage() {
  return (
    <AppShell
      eyebrow="Finance"
      title="Expenses"
      description="Review category performance, recent outflows, and log new spend in a dedicated dashboard page."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {expenseHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-border/80 bg-[#0f0f0f] p-4 shadow-[0_0_24px_rgba(0,0,0,0.2)]"
              >
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.28em] text-gray-500">
                  <Icon size={15} className={item.color} />
                  {item.label}
                </div>
                <div className={`mt-3 text-2xl font-semibold ${item.color}`}>{item.value}</div>
              </div>
            );
          })}
        </div>

        <ExpenseSection />
      </div>
    </AppShell>
  );
}
