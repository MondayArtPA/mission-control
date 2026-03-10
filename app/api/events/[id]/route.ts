import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { type Event } from "@/lib/events";

const DATA_FILE = path.join(process.cwd(), "data", "events.json");

async function readEvents(): Promise<Event[]> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeEvents(events: Event[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2));
}

// DELETE /api/events/[id] - Delete single event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const events = await readEvents();
    const filteredEvents = events.filter((e) => e.id !== id);

    if (filteredEvents.length === events.length) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    await writeEvents(filteredEvents);
    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
