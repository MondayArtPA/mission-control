#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { postMissionControlEvent, resolveBaseUrl } from "./lib/mission-control-events.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_RUNS_FILE = process.env.OPENCLAW_SUBAGENT_RUNS_FILE || "/Users/Openclaw/.openclaw/subagents/runs.json";
const DEFAULT_STATE_FILE = process.env.MISSION_CONTROL_BRIDGE_STATE_FILE || path.join(projectRoot, "data", "bridge-state.json");
const DEFAULT_POLL_MS = Number(process.env.MISSION_CONTROL_BRIDGE_POLL_MS || 5000);
const SUPPORTED_AGENTS = ["MONDAY", "BLUEPRINT", "QUANT", "SWISS", "PIXAR", "HUBBLE", "MARCUS", "SYSTEM"];
const SUPPORTED_AGENT_SET = new Set(SUPPORTED_AGENTS);

const AGENT_PATTERNS = {
  MONDAY: [
    /\bmonday\b/i,
    /thinking partner/i,
    /personal assistant/i,
    /smart assistant/i,
  ],
  BLUEPRINT: [
    /\bblueprint\b/i,
    /engineering/i,
    /builder/i,
    /build(?:,|\s|\/)/i,
    /code(?:,|\s|\/)/i,
    /dashboard/i,
    /api\b/i,
  ],
  QUANT: [
    /\bquant\b/i,
    /finance/i,
    /financial/i,
    /roi\b/i,
    /investment/i,
    /forecast/i,
    /budget/i,
  ],
  SWISS: [
    /\bswiss\b/i,
    /operations/i,
    /workflow/i,
    /automation/i,
    /file management/i,
    /organi[sz]e/i,
  ],
  PIXAR: [
    /\bpixar\b/i,
    /creative/i,
    /content/i,
    /social media/i,
    /copywriting/i,
    /branding/i,
    /design/i,
  ],
  HUBBLE: [
    /\bhubble\b/i,
    /research/i,
    /intelligence/i,
    /tech news/i,
    /trend/i,
    /market scan/i,
  ],
  MARCUS: [
    /\bmarcus\b/i,
    /health/i,
    /wellness/i,
    /mindfulness/i,
    /fitness/i,
  ],
  SYSTEM: [
    /\bsystem\b/i,
    /infra(?:structure)?/i,
    /healthcheck/i,
    /daemon/i,
    /service/i,
    /gateway/i,
    /launchd/i,
  ],
};

function parseArgs(argv) {
  const options = {
    once: false,
    verbose: false,
    runsFile: DEFAULT_RUNS_FILE,
    stateFile: DEFAULT_STATE_FILE,
    pollMs: DEFAULT_POLL_MS,
    baseUrl: resolveBaseUrl(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") options.once = true;
    else if (arg === "--verbose") options.verbose = true;
    else if (arg === "--runs-file") options.runsFile = argv[++i];
    else if (arg === "--state-file") options.stateFile = argv[++i];
    else if (arg === "--poll-ms") options.pollMs = Number(argv[++i]);
    else if (arg === "--base-url") options.baseUrl = resolveBaseUrl(argv[++i]);
  }

  return options;
}

async function ensureParentDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureParentDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function normalizeText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text, maxLen = 220) {
  const cleaned = normalizeText(text);
  if (!cleaned) return "Completed task";
  const parts = cleaned.split(/(?<=[.!?])\s+/);
  const picked = parts.find(Boolean) || cleaned;
  return picked.length > maxLen ? `${picked.slice(0, maxLen - 1).trimEnd()}…` : picked;
}

function titleFromTask(task) {
  const cleaned = normalizeText(task);
  if (!cleaned) return "Completed task";
  const firstLine = cleaned.split(/\n+/)[0];
  return firstLine.length > 120 ? `${firstLine.slice(0, 119).trimEnd()}…` : firstLine;
}

function collectTextSignals(run) {
  return [
    run.label,
    run.task,
    run.frozenResultText,
    run.requesterSessionKey,
    run.childSessionKey,
    run.errorText,
  ]
    .map(normalizeText)
    .filter(Boolean);
}

function addAgentScore(scores, agent, amount, reason, matches) {
  scores[agent] = scores[agent] || { score: 0, reasons: [] };
  scores[agent].score += amount;
  if (reason) {
    scores[agent].reasons.push(matches ? `${reason}:${matches}` : reason);
  }
}

function inferAgent(run) {
  const scores = {};
  const label = normalizeText(run.label);
  const texts = collectTextSignals(run);

  const labelPrefix = label.split(/[-_:\s]/)[0].toUpperCase();
  if (SUPPORTED_AGENT_SET.has(labelPrefix)) {
    addAgentScore(scores, labelPrefix, 100, "label-prefix");
  }

  for (const sessionKey of [run.childSessionKey, run.requesterSessionKey]) {
    const normalized = normalizeText(sessionKey).toUpperCase();
    for (const agent of SUPPORTED_AGENTS) {
      if (normalized.includes(`:${agent}:`)) {
        addAgentScore(scores, agent, 80, "session-key");
      }
    }
  }

  for (const text of texts) {
    const upperText = text.toUpperCase();
    for (const agent of SUPPORTED_AGENTS) {
      if (upperText.includes(agent)) {
        addAgentScore(scores, agent, 5, "explicit-agent-name");
      }

      const patterns = AGENT_PATTERNS[agent] || [];
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) matches += 1;
      }
      if (matches > 0) {
        addAgentScore(scores, agent, matches, "text-match", matches);
      }
    }
  }

  let bestAgent = "SYSTEM";
  let bestScore = 0;
  let secondBestScore = 0;

  for (const agent of SUPPORTED_AGENTS) {
    const score = scores[agent]?.score || 0;
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestAgent = agent;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  const confident = bestScore >= 3 && bestScore > secondBestScore;
  return {
    agent: confident ? bestAgent : "SYSTEM",
    confidence: confident ? "high" : bestScore > 0 ? "low" : "none",
    scores,
  };
}

function summarizeTask(task, label, agent, resultText) {
  const taskText = normalizeText(task).toLowerCase();
  const labelText = String(label || "").toLowerCase();

  if (labelText.includes("expense-page-review") || taskText.includes("expense page concept") || taskText.includes("what views/sections should be shown")) {
    return "Reviewed expense dashboard angles";
  }
  if (labelText.includes("expense-ui") || taskText.includes("expense ui inside") || taskText.includes("expense dashboard section")) {
    return "Added expense dashboard section";
  }
  if (labelText.includes("sidebar-pages") || taskText.includes("multi-page app with a left sidebar") || taskText.includes("separate expenses into its own page")) {
    return "Refactored Mission Control into multi-page layout";
  }
  if (labelText.includes("auto-all-agents") || taskText.includes("works for all agents") || taskText.includes("expand agent coverage")) {
    return "Expanded agent auto-bridge coverage";
  }
  if (labelText.includes("expense") || taskText.includes("expense tracker")) {
    return "Built expense tracker REST API";
  }
  if (labelText.includes("fix-build") || taskText.includes("build issue")) {
    return "Fixed Mission Control build issue";
  }
  if (labelText.includes("auto-bridge") || taskText.includes("automatic bridge") || taskText.includes("activity feed receives agent task completion")) {
    return "Extended automatic OpenClaw activity bridge";
  }

  const taskTitle = titleFromTask(task)
    .replace(/^build\s+/i, "Built ")
    .replace(/^fix\s+/i, "Fixed ")
    .replace(/^implement\s+/i, "Implemented ")
    .replace(/^create\s+/i, "Created ");

  return taskTitle || `${agent} completed task`;
}

function buildMessage(run, agent) {
  return summarizeTask(run.task, run.label, agent, run.frozenResultText);
}

function shouldBridgeRun(run) {
  return Boolean(
    run &&
      run.endedAt &&
      run.outcome?.status === "ok" &&
      run.endedReason === "subagent-complete" &&
      run.frozenResultText
  );
}

async function syncRuns(options) {
  const runsData = await readJson(options.runsFile, { runs: {} });
  const state = await readJson(options.stateFile, {
    version: 2,
    processedRunIds: {},
    lastSyncedAt: null,
  });

  const entries = Object.values(runsData.runs || {})
    .filter(shouldBridgeRun)
    .sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0));

  let posted = 0;

  for (const run of entries) {
    if (state.processedRunIds[run.runId]) continue;

    const inferred = inferAgent(run);
    const agent = inferred.agent;
    const message = buildMessage(run, agent);
    const metadata = {
      status: "completed",
      source: "openclaw-subagent-bridge",
      runId: run.runId,
      label: run.label || null,
      model: run.model || null,
      requesterSessionKey: run.requesterSessionKey || null,
      childSessionKey: run.childSessionKey || null,
      endedAt: run.endedAt || null,
      task: titleFromTask(run.task),
      result: normalizeText(run.frozenResultText).slice(0, 1000),
      inferredAgent: agent,
      inferredAgentConfidence: inferred.confidence,
      inferredAgentScores: Object.fromEntries(
        Object.entries(inferred.scores).map(([name, value]) => [name, value.score])
      ),
    };

    await postMissionControlEvent({
      agent,
      type: "task",
      message,
      metadata,
      baseUrl: options.baseUrl,
    });

    state.processedRunIds[run.runId] = {
      bridgedAt: new Date().toISOString(),
      agent,
      message,
      confidence: inferred.confidence,
    };
    posted += 1;

    if (options.verbose) {
      console.log(`[bridge] posted ${run.runId} -> ${agent} (${inferred.confidence}): ${message}`);
    }
  }

  state.lastSyncedAt = new Date().toISOString();
  await writeJson(options.stateFile, state);

  return posted;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.once) {
    const posted = await syncRuns(options);
    if (options.verbose) console.log(`[bridge] sync complete, posted ${posted} event(s)`);
    return;
  }

  if (options.verbose) {
    console.log(`[bridge] watching ${options.runsFile}`);
    console.log(`[bridge] posting to ${options.baseUrl}/api/events`);
    console.log(`[bridge] state file ${options.stateFile}`);
  }

  await syncRuns(options);
  setInterval(() => {
    syncRuns(options).catch((error) => {
      console.error(`[bridge] sync failed: ${error.message}`);
    });
  }, options.pollMs);
}

main().catch((error) => {
  console.error(`[bridge] fatal: ${error.message}`);
  process.exit(1);
});
