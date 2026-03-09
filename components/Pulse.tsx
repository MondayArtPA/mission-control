"use client";

import { useState, useEffect } from "react";
import { Power } from "lucide-react";

type Status = "Online" | "Focus Mode" | "Offline";

export default function Pulse() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<Status>("Online");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const cycleStatus = () => {
    const statuses: Status[] = ["Online", "Focus Mode", "Offline"];
    const currentIndex = statuses.indexOf(status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatus(statuses[nextIndex]);
  };

  const getStatusColor = () => {
    switch (status) {
      case "Online":
        return "#22c55e"; // green
      case "Focus Mode":
        return "#fbbf24"; // amber
      case "Offline":
        return "#9ca3af"; // gray
    }
  };

  return (
    <div className="border border-border/80 rounded-[28px] p-6 sm:p-8 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] shadow-[0_0_40px_rgba(0,255,255,0.04)]">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
        {/* Left: Time & Title */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* Clock */}
          <div>
            <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-wide">
              {formatDate(currentTime)}
            </div>
            <div className="text-4xl font-bold font-mono tracking-tight bg-gradient-to-r from-accent-cyan to-accent-magenta bg-clip-text text-transparent sm:text-5xl xl:text-6xl">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden h-20 w-px bg-gradient-to-b from-transparent via-border to-transparent lg:block" />

          {/* Mission Control Title */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              <span className="bg-gradient-to-r from-accent-cyan via-accent-magenta to-accent-cyan bg-clip-text text-transparent">
                Artistuta
              </span>
            </h1>
            <div className="text-sm text-gray-400 font-medium tracking-wide uppercase">
              Mission Control
            </div>
          </div>
        </div>

        {/* Center: North Star */}
        <div className="flex-1 px-0 text-left xl:px-8 xl:text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-1 h-1 rounded-full bg-accent-amber animate-pulse" />
            <div className="text-xs text-accent-amber font-semibold uppercase tracking-widest">
              North Star
            </div>
            <div className="w-1 h-1 rounded-full bg-accent-amber animate-pulse" />
          </div>
          <div className="text-xl font-medium text-gray-200 italic leading-relaxed">
            "Build systems that scale, not just tasks."
          </div>
        </div>

        {/* Right: Status Toggle */}
        <div className="flex flex-col gap-2 xl:items-end">
          <button
            onClick={cycleStatus}
            className="flex items-center gap-3 px-5 py-3 border-2 rounded-xl hover:bg-[#1a1a1a] transition-all hover:scale-105 shadow-lg"
            style={{
              borderColor: getStatusColor(),
              color: getStatusColor(),
              boxShadow: `0 0 20px ${getStatusColor()}33`,
            }}
          >
            <Power size={20} />
            <span className="font-mono text-base font-semibold">{status}</span>
          </button>
          <div className="text-xs text-gray-600 font-mono">Click to change</div>
        </div>
      </div>
    </div>
  );
}
