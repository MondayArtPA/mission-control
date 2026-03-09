# useTodos Hook

React hook for managing todos with the Todo API.

## Usage

```typescript
import { useTodos } from "@/hooks/useTodos";

function TodoList() {
  const {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    deleteAllTodos,
    refreshTodos,
  } = useTodos();

  // Add new todo
  const handleAdd = async () => {
    await addTodo("New task");
  };

  // Toggle completion
  const handleToggle = async (id: string, completed: boolean) => {
    await updateTodo(id, { completed: !completed });
  };

  // Update title
  const handleUpdateTitle = async (id: string) => {
    await updateTodo(id, { title: "Updated title" });
  };

  // Delete todo
  const handleDelete = async (id: string) => {
    await deleteTodo(id);
  };

  // Clear all
  const handleClearAll = async () => {
    await deleteAllTodos();
  };

  // Refresh list
  const handleRefresh = async () => {
    await refreshTodos();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggle(todo.id, todo.completed)}
          />
          <span>{todo.title}</span>
          <button onClick={() => handleDelete(todo.id)}>Delete</button>
        </div>
      ))}
      <button onClick={handleAdd}>Add Todo</button>
      <button onClick={handleClearAll}>Clear All</button>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
}
```

## API

### Return Values

- `todos: Todo[]` - Array of todo items
- `loading: boolean` - Loading state
- `error: string | null` - Error message if any
- `addTodo(title: string): Promise<void>` - Create new todo
- `updateTodo(id, updates): Promise<void>` - Update todo (title or completed)
- `deleteTodo(id: string): Promise<void>` - Delete single todo
- `deleteAllTodos(): Promise<void>` - Delete all todos
- `refreshTodos(): Promise<void>` - Manually refresh todo list

### Todo Type

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Features

- Automatic fetching on mount
- Optimistic local updates
- Error handling
- TypeScript support
- Loading states
