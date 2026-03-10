import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "events.json");

export interface Event {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  message: string;
  metadata?: Record<string, any>;
}

async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function readEvents(): Promise<Event[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeEvents(events: Event[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2));
}
