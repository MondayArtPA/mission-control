import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "todos.json");

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  agent?: string; // Agent assigned to this todo
  createdAt: string;
  updatedAt: string;
}

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read todos from file
async function readTodos(): Promise<Todo[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Write todos to file
async function writeTodos(todos: Todo[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2));
}

// GET /api/todos - Get all todos
export async function GET() {
  try {
    const todos = await readTodos();
    return NextResponse.json({ success: true, data: todos });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

// POST /api/todos - Create new todo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, agent } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const todos = await readTodos();
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      agent: agent || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    todos.push(newTodo);
    await writeTodos(todos);

    return NextResponse.json({ success: true, data: newTodo }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create todo" },
      { status: 500 }
    );
  }
}

// DELETE /api/todos - Delete all todos
export async function DELETE() {
  try {
    await writeTodos([]);
    return NextResponse.json({ success: true, message: "All todos deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete todos" },
      { status: 500 }
    );
  }
}
