import { NextRequest, NextResponse } from "next/server";
import { applyTaskUpdates, validateTaskUpdateInput } from "@/lib/tasks";
import { readTodos, Todo, writeTodos } from "../route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const todos = await readTodos();
    const todo = todos.find((t) => t.id === id);

    if (!todo) {
      return NextResponse.json(
        { success: false, error: "Todo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: todo });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch todo" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates = validateTaskUpdateInput(body);

    const todos = await readTodos();
    const todoIndex = todos.findIndex((t) => t.id === id);

    if (todoIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Todo not found" },
        { status: 404 }
      );
    }

    const updatedTodo: Todo = applyTaskUpdates(todos[todoIndex], updates);
    todos[todoIndex] = updatedTodo;
    await writeTodos(todos);

    return NextResponse.json({ success: true, data: updatedTodo });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update todo" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const todos = await readTodos();
    const filteredTodos = todos.filter((t) => t.id !== id);

    if (filteredTodos.length === todos.length) {
      return NextResponse.json(
        { success: false, error: "Todo not found" },
        { status: 404 }
      );
    }

    await writeTodos(filteredTodos);
    return NextResponse.json({ success: true, message: "Todo deleted" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
