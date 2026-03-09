import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  normalizeTaskRecord,
  TaskRecord,
  validateTaskCreateInput,
} from "@/lib/tasks";

const DATA_FILE = path.join(process.cwd(), "data", "todos.json");

export type Todo = TaskRecord;

async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function readTodos(): Promise<Todo[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data).map(normalizeTaskRecord);
  } catch {
    return [];
  }
}

export async function writeTodos(todos: Todo[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2));
}

export async function GET() {
  try {
    const todos = await readTodos();
    todos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ success: true, data: todos });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = validateTaskCreateInput(body);
    const now = new Date().toISOString();

    const todos = await readTodos();
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: input.title,
      status: input.status,
      agent: input.agent,
      blockedReason: input.status === "blocked" ? input.blockedReason : undefined,
      createdAt: now,
      updatedAt: now,
      completedAt: input.status === "completed" ? now : undefined,
    };

    todos.push(newTodo);
    await writeTodos(todos);

    return NextResponse.json({ success: true, data: newTodo }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create todo" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    await writeTodos([]);
    return NextResponse.json({ success: true, message: "All todos deleted" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete todos" },
      { status: 500 }
    );
  }
}
