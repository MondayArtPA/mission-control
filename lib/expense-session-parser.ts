import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";

const SESSION_ROOT = process.env.OPENCLAW_AGENT_DIR ?? path.join(process.env.HOME ?? "", ".openclaw", "agents");
const SESSION_TIMEZONE = "Asia/Bangkok";
const USD_TO_THB_RATE = Number(process.env.EXPENSES_USD_TO_THB ?? 33);
const ENTRY_CATEGORY = "model-usage";

const sessionCache = new Map<string, { signature: string; result: SessionParserResult }>();

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function getDateFormatter(timezone: string) {
  if (!dateFormatters.has(timezone)) {
    dateFormatters.set(
      timezone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    );
  }
  return dateFormatters.get(timezone)!;
}

export interface ExpenseLogEntry {
  timestamp: string;
  day: string;
  agent: string;
  model?: string;
  category: string;
  amount: number;
  currency: string;
  sourceLine: string;
}

export interface SessionCost {
  timestamp: string;
  agent: string;
  model: string;
  costUsd: number;
  costThb: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
}

export interface SessionParserStats {
  filesScanned: number;
  messagesProcessed: number;
  ignoredMissingCost: number;
}

export interface SessionParserResult {
  entries: ExpenseLogEntry[];
  stats: SessionParserStats;
}

interface SessionFileInfo {
  agent: string;
  filePath: string;
  mtimeMs: number;
  size: number;
}

interface ParseParams {
  month: string;
  range: { start: Date; end: Date };
  timezone?: string;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function parseSessionExpenses({ month, range, timezone = SESSION_TIMEZONE }: ParseParams): Promise<SessionParserResult> {
  const cacheKey = `${month}:${range.start.toISOString()}:${range.end.toISOString()}:${timezone}`;
  const files = await listSessionFiles();
  const signature = files
    .map((file) => `${file.filePath}:${file.mtimeMs}:${file.size}`)
    .sort()
    .join("|");

  const cached = sessionCache.get(cacheKey);
  if (cached && cached.signature === signature) {
    return cached.result;
  }

  const entries: ExpenseLogEntry[] = [];
  let messagesProcessed = 0;
  let ignoredMissingCost = 0;

  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file.filePath, "utf-8");
    } catch (error) {
      console.warn(`[expense-session-parser] Failed to read ${file.filePath}:`, error);
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let record: any;
      try {
        record = JSON.parse(line);
      } catch (error) {
        continue;
      }

      if (record.type !== "message" || !record.message) {
        continue;
      }

      messagesProcessed += 1;
      const usage = record.message.usage;
      const costTotal = typeof usage?.cost?.total === "number" ? usage.cost.total : undefined;
      if (!usage || typeof costTotal !== "number" || costTotal <= 0) {
        ignoredMissingCost += 1;
        continue;
      }

      const timestampIso = typeof record.timestamp === "string" ? record.timestamp : new Date(record.message.timestamp ?? Date.now()).toISOString();
      const timestamp = new Date(timestampIso);
      if (Number.isNaN(timestamp.getTime())) {
        continue;
      }

      if (timestamp < range.start || timestamp >= range.end) {
        continue;
      }

      const tokens = {
        input: Number(usage.input ?? usage.promptTokens ?? 0),
        output: Number(usage.output ?? usage.completionTokens ?? 0),
        total: typeof usage.totalTokens === "number" ? Number(usage.totalTokens) : 0,
      };

      if (!tokens.total || Number.isNaN(tokens.total)) {
        tokens.total = tokens.input + tokens.output;
      }

      const costUsd = costTotal;
      const costThb = roundCurrency(costUsd * USD_TO_THB_RATE);
      const formatter = getDateFormatter(timezone);
      const day = formatter.format(timestamp);
      const model = String(record.message.model ?? "UNSPECIFIED").trim() || "UNSPECIFIED";

      entries.push({
        timestamp: timestamp.toISOString(),
        day,
        agent: file.agent,
        model,
        category: ENTRY_CATEGORY,
        amount: costThb,
        currency: "THB",
        sourceLine: buildSourceLine({ file, record, model, costUsd, costThb }),
      });
    }
  }

  const result: SessionParserResult = {
    entries,
    stats: {
      filesScanned: files.length,
      messagesProcessed,
      ignoredMissingCost,
    },
  };

  sessionCache.set(cacheKey, { signature, result });

  return result;
}

async function listSessionFiles(): Promise<SessionFileInfo[]> {
  let agentDirents: Dirent[] = [];
  try {
    agentDirents = await fs.readdir(SESSION_ROOT, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: SessionFileInfo[] = [];

  for (const dirent of agentDirents) {
    if (!dirent.isDirectory()) continue;
    const agent = dirent.name;
    const sessionsDir = path.join(SESSION_ROOT, agent, "sessions");
    let sessionDirents: Dirent[] = [];

    try {
      sessionDirents = await fs.readdir(sessionsDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`[expense-session-parser] Unable to read ${sessionsDir}:`, error);
      }
      continue;
    }

    for (const sessionFile of sessionDirents) {
      if (!sessionFile.isFile()) continue;
      if (!sessionFile.name.endsWith(".jsonl")) continue;

      const filePath = path.join(sessionsDir, sessionFile.name);
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch (error) {
        console.warn(`[expense-session-parser] Unable to stat ${filePath}:`, error);
        continue;
      }

      files.push({
        agent,
        filePath,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
      });
    }
  }

  return files;
}

function buildSourceLine({
  file,
  record,
  model,
  costUsd,
  costThb,
}: {
  file: SessionFileInfo;
  record: any;
  model: string;
  costUsd: number;
  costThb: number;
}) {
  const basename = path.basename(file.filePath);
  const messageId = record.id ?? record.message?.id ?? "?";
  return `[session:${file.agent}] ${basename}#${messageId} ${model} → $${costUsd.toFixed(4)} (฿${costThb.toFixed(2)})`;
}
