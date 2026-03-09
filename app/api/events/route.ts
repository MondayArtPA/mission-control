import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "events.json");

export interface Event {
  id: string;
  timestamp: string;
  agent: string; // Agent name (MONDAY, BLUEPRINT, SWISS, etc.)
  type: string; // system, task, notification, etc.
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

async function readEvents(): Promise<Event[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeEvents(events: Event[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2));
}

// GET /api/events - Get all events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get("agent");
    const limit = searchParams.get("limit");
    
    let events = await readEvents();
    
    // Filter by agent if specified
    if (agent) {
      events = events.filter((e) => e.agent === agent);
    }
    
    // Sort by timestamp descending (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit results if specified
    if (limit) {
      events = events.slice(0, parseInt(limit));
    }
    
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, type, message, metadata } = body;

    if (!agent || !message) {
      return NextResponse.json(
        { success: false, error: "Agent and message are required" },
        { status: 400 }
      );
    }

    const events = await readEvents();
    const newEvent: Event = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      agent: agent.toUpperCase(),
      type: type || "event",
      message: message.trim(),
      metadata: metadata || {},
    };

    events.push(newEvent);
    await writeEvents(events);

    return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// DELETE /api/events - Delete all events
export async function DELETE() {
  try {
    await writeEvents([]);
    return NextResponse.json({ success: true, message: "All events deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete events" },
      { status: 500 }
    );
  }
}
