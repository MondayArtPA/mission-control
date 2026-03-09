"use client";

import { useState, useEffect } from "react";
import Pulse from "@/components/Pulse";
import BrainSection from "@/components/BrainSection";
import FeedSection from "@/components/FeedSection-vertical";
import StatsSection from "@/components/StatsSection";
import TodoSection from "@/components/TodoSection-compact";

export default function MissionControl() {
  return (
    <div className="min-h-screen p-6">
      {/* Header - The Pulse */}
      <Pulse />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column - Todo List & Brain */}
        <div className="lg:col-span-3 space-y-6">
          <TodoSection />
          <BrainSection />
        </div>

        {/* Center Column - The Feed */}
        <div className="lg:col-span-6">
          <FeedSection />
        </div>

        {/* Right Column - The Stats */}
        <div className="lg:col-span-3">
          <StatsSection />
        </div>
      </div>
    </div>
  );
}
