"use client";

import { useState, useEffect } from "react";
import { Brain, CheckSquare, Square } from "lucide-react";

interface Priority {
  id: number;
  text: string;
  completed: boolean;
}

export default function BrainSection() {
  const [quickNote, setQuickNote] = useState("");
  const [priorities, setPriorities] = useState<Priority[]>([
    { id: 1, text: "Review Mission Control dashboard", completed: false },
    { id: 2, text: "Plan Q1 strategy", completed: false },
    { id: 3, text: "Deep work session: 2hrs", completed: false },
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedNote = localStorage.getItem("quickNote");
    const savedPriorities = localStorage.getItem("priorities");

    if (savedNote) setQuickNote(savedNote);
    if (savedPriorities) setPriorities(JSON.parse(savedPriorities));
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("quickNote", quickNote);
  }, [quickNote]);

  useEffect(() => {
    localStorage.setItem("priorities", JSON.stringify(priorities));
  }, [priorities]);

  const togglePriority = (id: number) => {
    setPriorities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Note */}
      <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-accent-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Quick Capture
          </h2>
        </div>
        <textarea
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Brain dump anything here..."
          className="w-full h-32 bg-[#1a1a1a] border border-border rounded p-3 text-sm font-mono resize-none focus:outline-none focus:border-accent-cyan transition-colors"
        />
      </div>

      {/* Top 3 Priorities */}
      <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={18} className="text-accent-green" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Top 3 Priorities
          </h2>
        </div>
        <div className="space-y-2">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              onClick={() => togglePriority(priority.id)}
              className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded cursor-pointer transition-colors"
            >
              {priority.completed ? (
                <CheckSquare size={18} className="text-accent-green" />
              ) : (
                <Square size={18} className="text-gray-500" />
              )}
              <span
                className={`text-sm font-mono ${
                  priority.completed
                    ? "line-through text-gray-500"
                    : "text-foreground"
                }`}
              >
                {priority.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
