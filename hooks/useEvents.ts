import { useState, useEffect } from "react";

export interface Event {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  message: string;
  metadata?: Record<string, any>;
}

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  addEvent: (event: Omit<Event, "id" | "timestamp">) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  deleteAllEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  agents: string[];
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/events");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch events");
      }

      setEvents(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (event: Omit<Event, "id" | "timestamp">) => {
    try {
      setError(null);
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create event");
      }

      setEvents((prev) => [data.data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    const previousEvents = [...events];
    setEvents((prev) => prev.filter((e) => e.id !== id));

    try {
      setError(null);
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete event");
      }
    } catch (err) {
      setEvents(previousEvents);
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  const deleteAllEvents = async () => {
    const previousEvents = [...events];
    setEvents([]);

    try {
      setError(null);
      const response = await fetch("/api/events", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete all events");
      }
    } catch (err) {
      setEvents(previousEvents);
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  };

  const refreshEvents = async () => {
    await fetchEvents();
  };

  useEffect(() => {
    fetchEvents();
    // Poll every 5 seconds for new events
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get unique agents
  const agents = Array.from(new Set(events.map((e) => e.agent))).sort();

  return {
    events,
    loading,
    error,
    addEvent,
    deleteEvent,
    deleteAllEvents,
    refreshEvents,
    agents,
  };
}
