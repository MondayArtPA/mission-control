import fs from "fs/promises";
import path from "path";
import type { ActivityEvent } from "@/types/task";

const ACTIVITY_FILE = path.join(process.cwd(), "data", "activity-log.json");

interface ActivityLogFile {
  events: ActivityEvent[];
}

async function ensureFile() {
  try {
    await fs.access(ACTIVITY_FILE);
  } catch {
    await fs.mkdir(path.dirname(ACTIVITY_FILE), { recursive: true });
    const empty: ActivityLogFile = { events: [] };
    await fs.writeFile(ACTIVITY_FILE, JSON.stringify(empty, null, 2));
  }
}

async function readLogFile(): Promise<ActivityLogFile> {
  await ensureFile();
  const raw = await fs.readFile(ACTIVITY_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return {
      events: Array.isArray(parsed?.events) ? parsed.events : [],
    };
  } catch {
    return { events: [] };
  }
}

async function writeLogFile(data: ActivityLogFile) {
  await ensureFile();
  await fs.writeFile(ACTIVITY_FILE, JSON.stringify(data, null, 2));
}

export async function readActivityLog(limit = 25): Promise<ActivityEvent[]> {
  const { events } = await readLogFile();
  return events
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export interface CreateActivityInput {
  source: ActivityEvent["source"];
  type: ActivityEvent["type"];
  message: string;
  priority?: ActivityEvent["priority"];
}

export async function appendActivityEvent(input: CreateActivityInput): Promise<ActivityEvent> {
  const data = await readLogFile();
  const event: ActivityEvent = {
    id: `evt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: input.source,
    type: input.type,
    message: input.message,
    priority: input.priority,
  };
  data.events.push(event);
  await writeLogFile(data);
  return event;
}
