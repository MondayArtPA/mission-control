"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AgentCard from "@/components/agent-card";
import TaskAssignmentForm from "@/components/task-assignment-form";
import ActivityFeed from "@/components/activity-feed";
import AgentDetailPanel from "@/components/agent-detail-panel";
import type { ActivityEvent, AgentName, AgentOverview, TaskRecord } from "@/types/task";

const POLL_INTERVAL = 10000;

export default function CommandCenterHome() {
  const [agents, setAgents] = useState<AgentOverview[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [activityLimit, setActivityLimit] = useState(25);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [agentRes, taskRes, activityRes] = await Promise.all([
        fetch("/api/agents").then((res) => res.json()),
        fetch("/api/tasks").then((res) => res.json()),
        fetch(`/api/activity?limit=${activityLimit}`).then((res) => res.json()),
      ]);

      if (agentRes.success) setAgents(agentRes.data);
      if (taskRes.success) setTasks(taskRes.data);
      if (activityRes.success) setEvents(activityRes.data);
    } catch (error) {
      console.error("โหลดข้อมูลไม่สำเร็จ", error);
    }
  }, [activityLimit]);

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadAll]);

  const handleAgentClick = (agentId: AgentName) => {
    setSelectedAgent(agentId);
    setPanelOpen(true);
  };

  const selectedSnapshot = useMemo(() => {
    if (!selectedAgent) return null;
    const overview = agents.find((item) => item.id === selectedAgent);
    if (!overview) return null;
    const agentTasks = tasks.filter((task) => task.agent === selectedAgent);
    return { overview, tasks: agentTasks };
  }, [selectedAgent, agents, tasks]);

  const summary = useMemo(() => {
    const today = new Date();
    const isSameDay = (value?: string | null) => {
      if (!value) return false;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    };

    let inProgress = 0;
    let queued = 0;
    let completedToday = 0;

    tasks.forEach((task) => {
      if (task.status === "in_progress") inProgress += 1;
      if (task.status === "new" || task.status === "queued") queued += 1;
      if (task.status === "completed" && isSameDay(task.completedAt)) completedToday += 1;
    });

    return { inProgress, queued, completedToday };
  }, [tasks]);

  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(
      new Date().toLocaleDateString("th-TH", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    );
  }, []);

  const handleLoadMore = () => {
    setActivityLimit((prev) => prev + 10);
  };

  return (
    <AppShell
      eyebrow="Command Grid"
      title="Command Center v2"
      description="ภาพรวม agent + assign งานแบบ brief เดียว ลด token cost ทันที"
    >
      <div className="space-y-8">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-accent-cyan">Agent Overview</div>
              <p className="text-sm text-gray-400">8 agent + SYSTEM พร้อมสถานะ real-time</p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-border/60 bg-[#0b111a] p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-accent-magenta/80">Today's overview</div>
                <p className="text-sm text-gray-400">สถานะงานวันนี้ · {todayLabel}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-[#0f1723] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">In Progress</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-accent-cyan">{summary.inProgress}</span>
                  <span className="text-sm text-gray-500">tasks</span>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[#120f18] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">In Queue</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-accent-amber">{summary.queued}</span>
                  <span className="text-sm text-gray-500">waiting</span>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[#101a17] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Completed (วันนี้)</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-accent-green">{summary.completedToday}</span>
                  <span className="text-sm text-gray-500">done</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onSelect={handleAgentClick} isSelected={selectedAgent === agent.id} />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TaskAssignmentForm agents={agents} onRefresh={loadAll} />
          </div>
          <div className="lg:col-span-1">
            <ActivityFeed events={events} agents={agents} onLoadMore={handleLoadMore} />
          </div>
        </section>
      </div>

      {selectedSnapshot && (
        <AgentDetailPanel
          agent={selectedSnapshot.overview}
          tasks={selectedSnapshot.tasks}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onRefresh={loadAll}
        />
      )}
    </AppShell>
  );
}
