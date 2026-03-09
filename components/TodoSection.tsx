"use client";

import { useState } from "react";
import { ListTodo, Plus, X, Loader2 } from "lucide-react";
import { useTodos } from "@/hooks/useTodos";

export default function TodoSection() {
  const {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
  } = useTodos();

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    setIsAdding(true);
    try {
      await addTodo(newTodoTitle);
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

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListTodo size={18} className="text-accent-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Todo List
          </h2>
        </div>
        <div className="text-xs font-mono text-gray-500">
          {activeTodos.length} active • {completedTodos.length} done
        </div>
      </div>

      {/* Input Area */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new todo... (Press Enter)"
          disabled={isAdding}
          className="flex-1 bg-[#1a1a1a] border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-cyan transition-colors disabled:opacity-50"
        />
        <button
          onClick={handleAddTodo}
          disabled={isAdding || !newTodoTitle.trim()}
          className="px-4 py-2 bg-accent-cyan hover:bg-accent-cyan/80 text-background font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Plus size={18} />
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && todos.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && todos.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No todos yet. Add one above!
        </div>
      )}

      {/* Todo List */}
      {todos.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {/* Active Todos */}
          {activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-2 bg-[#1a1a1a] border border-border rounded hover:bg-[#222] transition-colors group"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleComplete(todo.id, todo.completed)}
                className="w-4 h-4 rounded border-gray-600 bg-[#0a0a0a] text-accent-cyan focus:ring-accent-cyan focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm flex-1 font-mono">{todo.title}</span>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <>
              {activeTodos.length > 0 && (
                <div className="border-t border-border my-3 pt-3">
                  <div className="text-xs text-gray-500 mb-2 font-mono uppercase">
                    Completed
                  </div>
                </div>
              )}
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2 bg-[#1a1a1a] border border-border rounded hover:bg-[#222] transition-colors group opacity-60"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleComplete(todo.id, todo.completed)}
                    className="w-4 h-4 rounded border-gray-600 bg-[#0a0a0a] text-accent-green focus:ring-accent-green focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm flex-1 font-mono line-through text-gray-500">
                    {todo.title}
                  </span>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
