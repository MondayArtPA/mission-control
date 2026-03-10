"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Circle,
  Code,
  Heart,
  ListTodo,
  Loader2,
  PauseCircle,
  Plus,
  Settings,
  Sparkles,
  Telescope,
  TrendingUp,
  X,
} from "lucide-react";
import { useTodos } from "@/hooks/useTodos";
import { TASK_STATUS_LABELS, TaskStatus } from "@/lib/tasks";

const AGENT_ICONS: Record<string, any> = {
  MONDAY: Brain,
  BLUEPRINT: Code,
  QUANT: TrendingUp,
  SWISS: Settings,
  PIXAR: Sparkles,
  HUBBLE: Telescope,
  MARCUS: Heart,
};

const AGENT_COLORS: Record<string, string> = {
  MONDAY: "#fbbf24",
  BLUEPRINT: "#3b82f6",
  QUANT: "#d946ef",
  SWISS: "#ef4444",
  PIXAR: "#ff7700",
  HUBBLE: "#ec4899",
  MARCUS: "#22c55e",
  SYSTEM: "#888888",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "#9ca3af",
  "in-progress": "#fbbf24",
  completed: "#22c55e",
  blocked: "#ef4444",
};

const STATUS_ICONS: Record<TaskStatus, any> = {
  pending: Circle,
  "in-progress": PauseCircle,
  completed: CheckCircle2,
  blocked: AlertTriangle,
};

const STATUS_ORDER: TaskStatus[] = ["pending", "in-progress", "blocked", "completed"];

export default function TodoSection() {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("MONDAY");
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<string>("open");

  const counts = useMemo(() => ({
    pending: todos.filter((t) => t.status === "pending").length,
    inProgress: todos.filter((t) => t.status === "in-progress").length,
    blocked: todos.filter((t) => t.status === "blocked").length,
    completed: todos.filter((t) => t.status === "completed").length,
    open: todos.filter((t) => t.status !== "completed").length,
  }), [todos]);

  const filteredTodos = useMemo(() => {
    if (filter === "all") return todos;
    if (filter === "open") return todos.filter((t) => t.status !== "completed");
    return todos.filter((t) => t.status === filter);
  }, [filter, todos]);

  const groupedTodos = useMemo(() =>
    STATUS_ORDER.map((status) => ({ status, items: filteredTodos.filter((todo) => todo.status === status) }))
      .filter((group) => group.items.length > 0),
    [filteredTodos]
  );

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;
    setIsAdding(true);
    try {
      await addTodo(newTodoTitle, selectedAgent);
      setNewTodoTitle("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCycleStatus = async (id: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus =
      currentStatus === "pending"
        ? "in-progress"
        : currentStatus === "in-progress"
          ? "completed"
          : currentStatus === "blocked"
            ? "in-progress"
            : "pending";

    await updateTodo(id, { status: nextStatus, blockedReason: undefined });
  };

  const statusSummary = `${counts.open} open • ${counts.inProgress} active • ${counts.blocked} blocked`;

  return (
    <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListTodo size={16} className="text-accent-cyan" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Task Board</h2>
          </div>
          <div className="text-xs font-mono text-gray-500">{statusSummary}</div>
        </div>

        <div className="flex flex-wrap gap-1 text-xs border-b border-border pb-1">
          {[
            ["open", `Open (${counts.open})`],
            ["pending", `Pending (${counts.pending})`],
            ["in-progress", `In Progress (${counts.inProgress})`],
            ["blocked", `Blocked (${counts.blocked})`],
            ["completed", `Completed (${counts.completed})`],
            ["all", `All (${todos.length})`],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-2 py-1 rounded font-mono transition-colors ${
                filter === value
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
          placeholder="Create a task that reflects actual work to be done"
          disabled={isAdding}
          className="w-full min-h-[44px] rounded border border-border bg-[#1a1a1a] px-3 py-2 text-xs font-mono transition-colors focus:border-accent-cyan focus:outline-none disabled:opacity-50"
        />
        <div className="flex gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="flex-1 min-h-[44px] rounded border border-border bg-[#1a1a1a] px-2 py-1.5 text-xs font-mono transition-colors focus:border-accent-cyan focus:outline-none"
            style={{ color: AGENT_COLORS[selectedAgent] }}
          >
            {Object.keys(AGENT_ICONS).map((agent) => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
          <button
            onClick={handleAddTodo}
            disabled={isAdding || !newTodoTitle.trim()}
            className="min-h-[44px] rounded bg-accent-cyan px-3 py-1.5 font-semibold text-background transition-colors hover:bg-accent-cyan/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {error && <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">{error}</div>}
      {loading && todos.length === 0 && <div className="flex items-center justify-center py-4 text-gray-500"><Loader2 size={20} className="animate-spin" /></div>}
      {!loading && todos.length === 0 && <div className="text-center py-4 text-gray-500 text-xs">No tasks yet</div>}
      {!loading && todos.length > 0 && groupedTodos.length === 0 && <div className="text-center py-4 text-gray-500 text-xs">No tasks in this filter</div>}

      {groupedTodos.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {groupedTodos.map(({ status, items }) => {
            const StatusIcon = STATUS_ICONS[status];
            const color = STATUS_COLORS[status];

            return (
              <div key={status}>
                <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide" style={{ color }}>
                  <StatusIcon size={12} /> {TASK_STATUS_LABELS[status]} ({items.length})
                </div>
                <div className="space-y-1.5">
                  {items.map((todo) => {
                    const AgentIcon = todo.agent ? AGENT_ICONS[todo.agent] : null;
                    const agentColor = todo.agent ? AGENT_COLORS[todo.agent] : "#9ca3af";
                    const TodoStatusIcon = STATUS_ICONS[todo.status];
                    return (
                      <div
                        key={todo.id}
                        className="flex items-start gap-2 p-2 bg-[#1a1a1a] border border-border rounded hover:bg-[#222] transition-colors group"
                        style={{ borderLeftWidth: "3px", borderLeftColor: color }}
                      >
                        <button
                          onClick={() => handleCycleStatus(todo.id, todo.status)}
                          className="mt-0.5"
                          title={`Advance status from ${TASK_STATUS_LABELS[todo.status]}`}
                        >
                          <TodoStatusIcon size={14} style={{ color }} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            {AgentIcon && <AgentIcon size={12} className="mt-0.5 flex-shrink-0" style={{ color: agentColor }} />}
                            <p className="text-xs font-mono break-words flex-1">{todo.title}</p>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {todo.agent && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: agentColor + "22", color: agentColor }}>
                                {todo.agent}
                              </span>
                            )}
                            <select
                              value={todo.status}
                              onChange={(e) => updateTodo(todo.id, { status: e.target.value as TaskStatus })}
                              className="bg-[#111] border border-border rounded px-1.5 py-0.5 text-[11px] font-mono"
                              style={{ color }}
                            >
                              {STATUS_ORDER.map((option) => (
                                <option key={option} value={option}>{TASK_STATUS_LABELS[option]}</option>
                              ))}
                            </select>
                          </div>
                          {todo.blockedReason && todo.status === "blocked" && (
                            <div className="mt-1 text-[11px] text-red-300 font-mono">Blocked: {todo.blockedReason}</div>
                          )}
                        </div>
                        <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
