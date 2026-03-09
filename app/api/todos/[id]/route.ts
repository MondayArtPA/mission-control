import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Todo } from "../route";

const DATA_FILE = path.join(process.cwd(), "data", "todos.json");

async function readTodos(): Promise<Todo[]> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTodos(todos: Todo[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2));
}

// GET /api/todos/[id] - Get single todo
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch todo" },
      { status: 500 }
    );
  }
}

// PUT /api/todos/[id] - Update todo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, completed } = body;

    const todos = await readTodos();
    const todoIndex = todos.findIndex((t) => t.id === id);

    if (todoIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Todo not found" },
        { status: 404 }
      );
    }

    const updatedTodo: Todo = {
      ...todos[todoIndex],
      ...(title !== undefined && { title: title.trim() }),
      ...(completed !== undefined && { completed }),
      updatedAt: new Date().toISOString(),
    };

    todos[todoIndex] = updatedTodo;
    await writeTodos(todos);

    return NextResponse.json({ success: true, data: updatedTodo });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/[id] - Delete single todo
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
