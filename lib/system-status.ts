import fs from "fs/promises";
import path from "path";
import type { ExpenseBudgetStatus } from "@/types/expenses";

const STATUS_FILE = path.join(process.cwd(), "data", "status.json");

export interface ExpenseStatusState {
  month: string;
  lastStatus: ExpenseBudgetStatus;
  lastEventTimestamp?: string;
}

export interface SystemStatusState {
  expense?: ExpenseStatusState;
  updatedAt?: string;
}

async function ensureStatusDir() {
  const dir = path.dirname(STATUS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function readSystemStatusState(): Promise<SystemStatusState> {
  try {
    await ensureStatusDir();
    const data = await fs.readFile(STATUS_FILE, "utf-8");
    return JSON.parse(data) as SystemStatusState;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeSystemStatusState(state: SystemStatusState): Promise<void> {
  await ensureStatusDir();
  await fs.writeFile(STATUS_FILE, JSON.stringify(state, null, 2));
}
