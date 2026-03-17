import type { AgentName, PriorityLevel } from "@/types/task";

interface RouteResult {
  agent: AgentName;
  confidence: number;
  reason: string;
}

// P4: Monday Delegation - Auto-route based on expertise
// Keywords mapping to agents
const AGENT_KEYWORDS: Record<AgentName, string[]> = {
  blueprint: [
    "build", "code", "api", "web", "app", "deploy", "infrastructure", "docker",
    "database", "backend", "frontend", "system", "dashboard", "dev", "git",
    "programming", "software", "infrastructure", "server", "cloud", "aws", "gcp",
    "azure", "kubernetes", "terraform", "script", "automation", "pipeline",
    "fix", "bug", "feature", "refactor", "migrate", "integration"
  ],
  quant: [
    "finance", "financial", "roi", "investment", "budget", "cost", "pricing",
    "analysis", "model", "valuation", "return", "profit", "revenue", "expense",
    "forecast", "projection", "capital", "funding", "pitch", "due diligence",
    "valuation", "nps", "cac", "ltv", "margin", "earnings", "income", "tax"
  ],
  swiss: [
    "file", "workflow", "automation", "organize", "schedule", "cron", "backup",
    "sync", "process", "procedure", "template", "document", "organize", "sort",
    "clean", "archive", "system", "maintenance", "update", "install", "config",
    "setting", "tool", "utility", "batch", "script", "pipeline"
  ],
  pixar: [
    "content", "social", "media", "post", "tweet", "video", "image", "design",
    "creative", "presentation", "slide", "deck", "pitch", "brand", "marketing",
    "copywriting", "story", "narrative", "campaign", "ads", "visual", "graphic",
    "thumbnail", "caption", "blog", "article", "writing", "draft"
  ],
  hubble: [
    "research", "news", "trend", "market", "scan", "find", "search", "analyze",
    "report", "summary", "intel", "intelligence", "data", "information",
    "competition", "competitor", "industry", "landscape", "overview", "review",
    "insight", "signal", "opportunity", "pain point", "gap", "benchmark"
  ],
  marcus: [
    "health", "wellness", "mindful", "meditation", "fitness", "exercise",
    "nutrition", "diet", "sleep", "stress", "mental", "physical", "body",
    "routine", "habit", "personal", "life", "balance", "energy", "focus",
    "clarity", "advice", "counsel", "wisdom", "philosophy"
  ],
  monday: [
    "monday", "delegate", "route", "orchestrate", "coordinate", "plan",
    "strategy", "overview", "summary", "meeting", "discuss", "decide"
  ],
  trueone: [
    "true", "truemove", "dtac", "telco", "telecom", "pie", "retailer",
    "service transaction", "sim", "mobile", "network", "subscriber",
    "dealer", "shop", "activation", "provision", "roaming"
  ],
  system: [
    "system", "monitor", "alert", "status", "health", "metric", "log",
    "error", "incident", "performance", "optimization"
  ]
};

export function autoRouteTask(title: string, description?: string): RouteResult {
  const text = `${title} ${description || ""}`.toLowerCase();

  const scores: Record<AgentName, number> = {
    blueprint: 0,
    quant: 0,
    swiss: 0,
    pixar: 0,
    hubble: 0,
    marcus: 0,
    monday: 0,
    trueone: 0,
    system: 0
  };

  // Score each agent based on keyword matches
  for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[agent as AgentName] += 1;
      }
    }
  }

  // Find the agent with highest score
  let bestAgent: AgentName = "monday"; // default
  let bestScore = -1;

  for (const [agent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent as AgentName;
    }
  }

  // Confidence based on score difference
  const confidence = bestScore > 0 ? Math.min(bestScore / 3, 1) : 0;

  const reason = confidence > 0
    ? `Matched keywords: ${AGENT_KEYWORDS[bestAgent].filter(k => text.includes(k.toLowerCase())).join(", ")}`
    : "No clear match - default to monday";

  return {
    agent: bestAgent,
    confidence,
    reason
  };
}

export function suggestAgentForTask(title: string, description?: string): AgentName {
  const result = autoRouteTask(title, description);
  return result.agent;
}

// Priority-based routing hints
export function getRecommendedPriority(title: string, description?: string): PriorityLevel {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Critical indicators
  const criticalKeywords = ["urgent", "emergency", "critical", "asap", "now", "production", "down", "outage", "breach"];
  if (criticalKeywords.some(k => text.includes(k))) {
    return "CRITICAL";
  }

  // P1 indicators  
  const p1Keywords = ["important", "soon", "today", "deadline", "blocking"];
  if (p1Keywords.some(k => text.includes(k))) {
    return "P1";
  }

  // P3 indicators
  const p3Keywords = ["someday", "when possible", "low priority", "nice to have"];
  if (p3Keywords.some(k => text.includes(k))) {
    return "P3";
  }

  // P4 indicators
  const p4Keywords = ["backlog", "future", "later", "tbd"];
  if (p4Keywords.some(k => text.includes(k))) {
    return "P4";
  }

  return "P2"; // default
}
