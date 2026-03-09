"use client";

import { useState, useEffect } from "react";
import { Activity, Plus } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
}

export default function FeedSection() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, timestamp: "08:00", message: "Deep Work Started" },
    { id: 2, timestamp: "10:30", message: "Coffee break - 15min" },
    { id: 3, timestamp: "12:00", message: "Lunch break" },
    { id: 4, timestamp: "14:00", message: "Client Call - Project X" },
  ]);
  const [newLogMessage, setNewLogMessage] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem("eventLogs");
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("eventLogs", JSON.stringify(logs));
  }, [logs]);

  const addLog = () => {
    if (!newLogMessage.trim()) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const newLog: LogEntry = {
      id: Date.now(),
      timestamp,
      message: newLogMessage,
    };

    setLogs((prev) => [...prev, newLog]);
    setNewLogMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addLog();
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-[#0f0f0f] h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-accent-magenta" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Event Feed
        </h2>
      </div>

      {/* Log Display */}
      <div className="space-y-2 mb-4 h-[calc(100%-120px)] overflow-y-auto pr-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-2 bg-[#1a1a1a] border border-border rounded"
          >
            <span className="text-accent-cyan font-mono text-xs mt-0.5">
              [{log.timestamp}]
            </span>
            <span className="text-sm flex-1">{log.message}</span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLogMessage}
          onChange={(e) => setNewLogMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Log an event... (Press Enter)"
          className="flex-1 bg-[#1a1a1a] border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-magenta transition-colors"
        />
        <button
          onClick={addLog}
          className="px-4 py-2 bg-accent-magenta hover:bg-accent-magenta/80 text-background font-semibold rounded transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
