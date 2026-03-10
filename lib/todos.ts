import fs from "fs/promises";
import path from "path";
import { normalizeTaskRecord, TaskRecord } from "@/lib/tasks";

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
