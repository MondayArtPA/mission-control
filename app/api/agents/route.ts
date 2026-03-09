import { NextResponse } from "next/server";

export interface Agent {
  id: string;
  name: string;
  color: string;
  status: "active" | "standby" | "offline";
  description: string;
  role: string;
  icon: string; // lucide-react icon name
}

// Known agents in the OpenClaw network
const KNOWN_AGENTS: Agent[] = [
  {
    id: "main",
    name: "MONDAY",
    color: "#fbbf24",
    status: "active",
    description: "Smart personal assistant and thinking partner",
    role: "Main Coordinator",
    icon: "Brain",
  },
  {
    id: "blueprint",
    name: "BLUEPRINT",
    color: "#3b82f6",
    status: "standby",
    description: "Build, code, systems, dashboards",
    role: "Engineering",
    icon: "Code",
  },
  {
    id: "quant",
    name: "QUANT",
    color: "#d946ef",
    status: "standby",
    description: "Finance, ROI, investment analysis",
    role: "Finance",
    icon: "TrendingUp",
  },
  {
    id: "swiss",
    name: "SWISS",
    color: "#ef4444",
    status: "standby",
    description: "Operations, files, workflow automation",
    role: "Operations",
    icon: "Settings",
  },
  {
    id: "pixar",
    name: "PIXAR",
    color: "#ff7700",
    status: "standby",
    description: "Content, social media, creative",
    role: "Creative",
    icon: "Sparkles",
  },
  {
    id: "hubble",
    name: "HUBBLE",
    color: "#ec4899",
    status: "standby",
    description: "Intelligence, AI/tech news, research",
    role: "Research",
    icon: "Telescope",
  },
  {
    id: "marcus",
    name: "MARCUS",
    color: "#22c55e",
    status: "standby",
    description: "Health, wellness, mindfulness, wisdom",
    role: "Wellness",
    icon: "Heart",
  },
  {
    id: "system",
    name: "SYSTEM",
    color: "#888888",
    status: "active",
    description: "System-level events and infrastructure monitoring",
    role: "System",
    icon: "Server",
  },
];

// GET /api/agents - Get all agents
export async function GET() {
  try {
    // In the future, could fetch from OpenClaw gateway
    // For now, return known agents
    return NextResponse.json({ success: true, data: KNOWN_AGENTS });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
