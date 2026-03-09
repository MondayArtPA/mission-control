"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Activity } from "lucide-react";

export default function StatsSection() {
  const [dayCompletion, setDayCompletion] = useState(0);

  useEffect(() => {
    const calculateDayCompletion = () => {
      const now = new Date();
      const wakeTime = new Date(now);
      wakeTime.setHours(7, 0, 0, 0); // Assume 7 AM wake time
      const sleepTime = new Date(now);
      sleepTime.setHours(23, 0, 0, 0); // Assume 11 PM sleep time

      const awakeHours = (sleepTime.getTime() - wakeTime.getTime()) / (1000 * 60 * 60);
      const elapsedHours = (now.getTime() - wakeTime.getTime()) / (1000 * 60 * 60);

      const completion = Math.min(Math.max((elapsedHours / awakeHours) * 100, 0), 100);
      setDayCompletion(Math.round(completion));
    };

    calculateDayCompletion();
    const timer = setInterval(calculateDayCompletion, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Day Completion */}
      <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-accent-amber" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Day Completion
          </h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-3xl font-bold font-mono">{dayCompletion}%</span>
            <span className="text-xs text-gray-500 font-mono">
              07:00 - 23:00
            </span>
          </div>
          <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-green to-accent-amber transition-all duration-500"
              style={{ width: `${dayCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={18} className="text-accent-green" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Financials
          </h2>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-1 font-mono">MRR</div>
            <div className="text-2xl font-bold font-mono text-accent-green">
              $12,450
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1 font-mono">Revenue (MTD)</div>
            <div className="text-2xl font-bold font-mono">$8,230</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1 font-mono">Growth</div>
            <div className="text-2xl font-bold font-mono text-accent-cyan">
              +23%
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="border border-border rounded-lg p-4 bg-[#0f0f0f]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-accent-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Metrics
          </h2>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-mono">Deep Work Hrs</span>
            <span className="text-lg font-bold font-mono">4.5</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-mono">Tasks Completed</span>
            <span className="text-lg font-bold font-mono text-accent-green">7/12</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-mono">Focus Score</span>
            <span className="text-lg font-bold font-mono text-accent-amber">85%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
