"use client";

import AppShell from "@/components/AppShell";
import Pulse from "@/components/Pulse";
import BrainSection from "@/components/BrainSection";
import FeedSection from "@/components/FeedSection-vertical";
import StatsSection from "@/components/StatsSection";
import TodoSection from "@/components/TodoSection-compact";
import ExpenseGraph from "@/components/ExpenseGraph";

export default function MissionControl() {
  return (
    <AppShell
      eyebrow="Operations"
      title="Agent's Activities"
      description="Track live agent work, active priorities, and mission-critical signals without mixing in finance workflows."
    >
      <div className="space-y-6">
        <Pulse />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-3">
            <TodoSection />
            <BrainSection />
          </div>

          <div className="xl:col-span-6">
            <FeedSection />
          </div>

          <div className="xl:col-span-3">
            <StatsSection />
          </div>
        </div>
        <ExpenseGraph />
      </div>
    </AppShell>
  );
}
