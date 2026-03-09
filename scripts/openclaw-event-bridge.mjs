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
const SUPPORTED_AGENTS = new Set(["MONDAY", "BLUEPRINT", "QUANT", "SWISS", "PIXAR", "HUBBLE", "MARCUS", "SYSTEM"]);

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

function inferAgent(run) {
  const labelPrefix = String(run.label || "").split(/[-_]/)[0].toUpperCase();
  if (SUPPORTED_AGENTS.has(labelPrefix)) return labelPrefix;

  const childParts = String(run.childSessionKey || "").split(":");
  const childAgent = childParts[1]?.toUpperCase();
  if (SUPPORTED_AGENTS.has(childAgent)) return childAgent;

  const requesterParts = String(run.requesterSessionKey || "").split(":");
  const requesterAgent = requesterParts[1]?.toUpperCase();
  if (SUPPORTED_AGENTS.has(requesterAgent)) return requesterAgent;

  return "SYSTEM";
}

function buildMessage(run, agent) {
  const summary = firstSentence(run.frozenResultText || "");
  if (summary && summary !== "Completed task") return summary;
  const taskTitle = titleFromTask(run.task);
  return `${agent} completed: ${taskTitle}`;
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
    version: 1,
    processedRunIds: {},
    lastSyncedAt: null,
  });

  const entries = Object.values(runsData.runs || {})
    .filter(shouldBridgeRun)
    .sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0));

  let posted = 0;

  for (const run of entries) {
    if (state.processedRunIds[run.runId]) continue;

    const agent = inferAgent(run);
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
    };
    posted += 1;

    if (options.verbose) {
      console.log(`[bridge] posted ${run.runId} -> ${agent}: ${message}`);
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
