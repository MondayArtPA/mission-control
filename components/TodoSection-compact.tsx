"use client";

import { useState, useEffect } from "react";
import { ListTodo, Plus, X, Loader2, Brain, Code, TrendingUp, Settings, Sparkles, Telescope, Heart } from "lucide-react";

const AGENT_ICONS: Record<string, any> = {
  MONDAY: Brain,
  BLUEPRINT: Code,
  QUANT: TrendingUp,
  SWISS: Settings,
  PIXAR: Sparkles,
  HUBBLE: Telescope,
  MARCUS: Heart,
};
import { useTodos } from "@/hooks/useTodos";

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

export default function TodoSection() {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("MONDAY");
  const [isAdding, setIsAdding] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>("pending"); // pending, all, or agent name

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    setIsAdding(true);
    try {
      await addTodo(newTodoTitle, selectedAgent);
      setNewTodoTitle("");
    } catch (err) {
      console.error("Failed to add todo:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await updateTodo(id, { completed: !completed });
    } catch (err) {
      console.error("Failed to update todo:", err);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id);
    } catch (err) {
      console.error("Failed to delete todo:", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTodo();
    }
  };

  // Filter todos based on selected tab
  const filteredTodos = todos.filter((t) => {
    if (filterAgent === "pending") {
      return !t.completed; // Only pending (active) todos
    } else if (filterAgent === "all") {
      return true; // All todos
    } else {
      return t.agent === filterAgent; // Specific agent
    }
  });

  const activeTodos = filteredTodos.filter((t) => !t.completed);
  const completedTodos = filteredTodos.filter((t) => t.completed);

  // Get unique agents with todos
  const agentsWithTodos = Array.from(
    new Set(todos.filter((t) => t.agent).map((t) => t.agent))
  ).sort();

  return (
    <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListTodo size={16} className="text-accent-cyan" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">
              Todo List
            </h2>
          </div>
          <div className="text-xs font-mono text-gray-500">
            {activeTodos.length} active
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 text-xs border-b border-border pb-1">
          <button
            onClick={() => setFilterAgent("pending")}
            className={`px-2 py-1 rounded font-mono transition-colors ${
              filterAgent === "pending"
                ? "bg-accent-cyan/20 text-accent-cyan"
                : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
            }`}
          >
            Pending ({todos.filter((t) => !t.completed).length})
          </button>
          <button
            onClick={() => setFilterAgent("all")}
            className={`px-2 py-1 rounded font-mono transition-colors ${
              filterAgent === "all"
                ? "bg-accent-cyan/20 text-accent-cyan"
                : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
            }`}
          >
            All ({todos.length})
          </button>
          {agentsWithTodos.map((agent) => {
            const agentTodoCount = todos.filter((t) => t.agent === agent).length;
            return (
              <button
                key={agent}
                onClick={() => setFilterAgent(agent!)}
                className={`px-2 py-1 rounded font-mono transition-colors ${
                  filterAgent === agent
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
                }`}
                style={
                  filterAgent === agent
                    ? {
                        background: AGENT_COLORS[agent!] + "33",
                        color: AGENT_COLORS[agent!],
                      }
                    : {}
                }
              >
                {agent} ({agentTodoCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-2 mb-3">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="New todo..."
          disabled={isAdding}
          className="w-full bg-[#1a1a1a] border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-cyan transition-colors disabled:opacity-50"
        />
        <div className="flex gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="flex-1 bg-[#1a1a1a] border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent-cyan transition-colors"
            style={{ color: AGENT_COLORS[selectedAgent] }}
          >
            <option value="MONDAY">MONDAY</option>
            <option value="BLUEPRINT">BLUEPRINT</option>
            <option value="SWISS">SWISS</option>
            <option value="QUANT">QUANT</option>
            <option value="PIXAR">PIXAR</option>
            <option value="HUBBLE">HUBBLE</option>
            <option value="MARCUS">MARCUS</option>
          </select>
          <button
            onClick={handleAddTodo}
            disabled={isAdding || !newTodoTitle.trim()}
            className="px-3 py-1.5 bg-accent-cyan hover:bg-accent-cyan/80 text-background font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && todos.length === 0 && (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && todos.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-xs">
          No todos yet
        </div>
      )}

      {/* Todo List */}
      {todos.length > 0 && (
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {/* Active Todos */}
          {activeTodos.map((todo) => {
            const AgentIcon = todo.agent ? AGENT_ICONS[todo.agent] : null;
            const agentColor = todo.agent ? AGENT_COLORS[todo.agent] : "#9ca3af";

            return (
              <div
                key={todo.id}
                className="flex items-start gap-2 p-2 bg-[#1a1a1a] border border-border rounded hover:bg-[#222] transition-colors group relative"
                style={
                  todo.agent
                    ? { borderLeftWidth: "3px", borderLeftColor: agentColor }
                    : {}
                }
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleComplete(todo.id, todo.completed)}
                  className="w-3.5 h-3.5 mt-0.5 rounded border-gray-600 bg-[#0a0a0a] text-accent-cyan focus:ring-accent-cyan focus:ring-offset-0 cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5">
                    {AgentIcon && (
                      <AgentIcon
                        size={12}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: agentColor }}
                      />
                    )}
                    <p className="text-xs font-mono break-words flex-1">
                      {todo.title}
                    </p>
                  </div>
                  {todo.agent && filterAgent === "pending" && (
                    <span
                      className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-mono"
                      style={{
                        background: agentColor + "22",
                        color: agentColor,
                      }}
                    >
                      {todo.agent}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <>
              {activeTodos.length > 0 && (
                <div className="border-t border-border my-2 pt-2">
                  <div className="text-xs text-gray-500 mb-1 font-mono uppercase">
                    Completed ({completedTodos.length})
                  </div>
                </div>
              )}
              {completedTodos.map((todo) => {
                const AgentIcon = todo.agent ? AGENT_ICONS[todo.agent] : null;
                const agentColor = todo.agent ? AGENT_COLORS[todo.agent] : "#9ca3af";

                return (
                  <div
                    key={todo.id}
                    className="flex items-start gap-2 p-2 bg-[#1a1a1a] border border-border rounded hover:bg-[#222] transition-colors group opacity-50 relative"
                    style={
                      todo.agent
                        ? { borderLeftWidth: "3px", borderLeftColor: agentColor }
                        : {}
                    }
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggleComplete(todo.id, todo.completed)}
                      className="w-3.5 h-3.5 mt-0.5 rounded border-gray-600 bg-[#0a0a0a] text-accent-green focus:ring-accent-green focus:ring-offset-0 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        {AgentIcon && (
                          <AgentIcon
                            size={12}
                            className="mt-0.5 flex-shrink-0 opacity-50"
                            style={{ color: agentColor }}
                          />
                        )}
                        <p className="text-xs font-mono line-through text-gray-500 break-words flex-1">
                          {todo.title}
                        </p>
                      </div>
                      {todo.agent && filterAgent === "pending" && (
                        <span
                          className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-mono opacity-60"
                          style={{
                            background: agentColor + "22",
                            color: agentColor,
                          }}
                        >
                          {todo.agent}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
