import { NextRequest, NextResponse } from "next/server";
import { validateTaskCreateInput } from "@/lib/tasks";
import { readTodos, writeTodos, type Todo } from "@/lib/todos";

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
