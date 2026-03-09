import { useState, useEffect } from "react";
import { TaskStatus } from "@/lib/tasks";

export interface Todo {
  id: string;
  title: string;
  status: TaskStatus;
  agent?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedReason?: string;
}

interface UseTodosReturn {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  addTodo: (title: string, agent?: string) => Promise<void>;
  updateTodo: (
    id: string,
    updates: Partial<Pick<Todo, "title" | "status" | "agent" | "blockedReason">>
  ) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  deleteAllTodos: () => Promise<void>;
  refreshTodos: () => Promise<void>;
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/todos");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch todos");
      }

      setTodos(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (title: string, agent?: string) => {
    try {
      setError(null);
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, agent }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to create todo");
      setTodos((prev) => [data.data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  const updateTodo = async (
    id: string,
    updates: Partial<Pick<Todo, "title" | "status" | "agent" | "blockedReason">>
  ) => {
    const previousTodos = [...todos];
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, ...updates, updatedAt: new Date().toISOString() } : todo
      )
    );

    try {
      setError(null);
      const response = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to update todo");
      setTodos((prev) => prev.map((todo) => (todo.id === id ? data.data : todo)));
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  const deleteTodo = async (id: string) => {
    const previousTodos = [...todos];
    setTodos((prev) => prev.filter((todo) => todo.id !== id));

    try {
      setError(null);
      const response = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to delete todo");
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  const deleteAllTodos = async () => {
    const previousTodos = [...todos];
    setTodos([]);

    try {
      setError(null);
      const response = await fetch("/api/todos", { method: "DELETE" });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to delete all todos");
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return { todos, loading, error, addTodo, updateTodo, deleteTodo, deleteAllTodos, refreshTodos: fetchTodos };
}
