import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Event } from "../route";

const DATA_FILE = path.join(process.cwd(), "data", "events.json");

// Seed initial events for demo
export async function POST() {
  try {
    const now = new Date();
    const seedEvents: Event[] = [
      {
        id: "1",
        timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        agent: "SYSTEM",
        type: "system",
        message: "Mission Control initialized",
      },
      {
        id: "2",
        timestamp: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
        agent: "MONDAY",
        type: "task",
        message: "Created AI adoption slide deck",
      },
      {
        id: "3",
        timestamp: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
        agent: "MONDAY",
        type: "task",
        message: "Created wellness trends presentation",
      },
      {
        id: "4",
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        agent: "BLUEPRINT",
        type: "task",
        message: "Built Mission Control dashboard",
      },
      {
        id: "5",
        timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
        agent: "BLUEPRINT",
        type: "task",
        message: "Created Todo List API with full CRUD",
      },
      {
        id: "6",
        timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        agent: "BLUEPRINT",
        type: "task",
        message: "Implemented optimistic updates for todos",
      },
      {
        id: "7",
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        agent: "SYSTEM",
        type: "notification",
        message: "All services operational",
      },
      {
        id: "8",
        timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        agent: "SWISS",
        type: "notification",
        message: "Workspace organized and ready",
      },
      {
        id: "9",
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        agent: "HUBBLE",
        type: "notification",
        message: "Monitoring 15 tech news sources",
      },
      {
        id: "10",
        timestamp: now.toISOString(),
        agent: "MONDAY",
        type: "notification",
        message: "Standing by for next request",
      },
    ];

    const dataDir = path.dirname(DATA_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(seedEvents, null, 2));

    return NextResponse.json({
      success: true,
      message: "Seed data created",
      count: seedEvents.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to seed events" },
      { status: 500 }
    );
  }
}
