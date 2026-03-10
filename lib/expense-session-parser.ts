import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";

import { TokenUsageGroup, TokenUsageSummary } from "@/types/expenses";
import { canonicalizeModelLabel, detectProviderFromModel, estimateUsdCostFromTokens, ProviderName, TokenCounts } from "@/lib/model-pricing";

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
  provider?: string;
  rawModel?: string;
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
  tokenUsage: TokenUsageSummary;
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

interface TokenUsageAccumulator {
  totals: TokenUsageGroup;
  byProvider: Map<string, TokenUsageGroup>;
  byAgent: Map<string, TokenUsageGroup>;
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
  const tokenUsageAccumulator = createTokenUsageAccumulator();
 
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
      const tokenCounts = normalizeTokenCounts(usage);
      const providerHint = getProviderHint(record);
      const rawModel = typeof record.message.model === "string" ? record.message.model : undefined;
      const canonicalModel = canonicalizeModelLabel(rawModel, providerHint);
      // Preserve original provider if available (e.g., "openrouter") instead of canonical provider
      const provider = providerHint ?? canonicalModel.provider ?? detectProviderFromModel(rawModel, providerHint);

      accumulateTokenUsage(tokenUsageAccumulator, provider, file.agent, tokenCounts);

      const timestampIso = typeof record.timestamp === "string" ? record.timestamp : new Date(record.message.timestamp ?? Date.now()).toISOString();
      const timestamp = new Date(timestampIso);
      if (Number.isNaN(timestamp.getTime())) {
        continue;
      }

      if (timestamp < range.start || timestamp >= range.end) {
        continue;
      }

      let costUsd = typeof costTotal === "number" ? costTotal : undefined;
      if ((!costUsd || costUsd <= 0) && canonicalModel.pricing) {
        const estimated = estimateUsdCostFromTokens(tokenCounts, canonicalModel.pricing);
        if (typeof estimated === "number" && estimated > 0) {
          costUsd = estimated;
        }
      }

      if (!usage || !costUsd || costUsd <= 0) {
        ignoredMissingCost += 1;
        continue;
      }

      const costThb = roundCurrency(costUsd * USD_TO_THB_RATE);
      const formatter = getDateFormatter(timezone);
      const day = formatter.format(timestamp);

      entries.push({
        timestamp: timestamp.toISOString(),
        day,
        agent: file.agent,
        model: canonicalModel.label,
        provider,
        rawModel,
        category: ENTRY_CATEGORY,
        amount: costThb,
        currency: "THB",
        sourceLine: buildSourceLine({ file, record, model: canonicalModel.label, costUsd, costThb }),
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
    tokenUsage: finalizeTokenUsage(tokenUsageAccumulator),
  };

  sessionCache.set(cacheKey, { signature, result });

  return result;
}

function normalizeTokenCounts(usage: any): TokenCounts {
  const rawInput = Number(usage?.input ?? usage?.promptTokens ?? 0);
  const rawOutput = Number(usage?.output ?? usage?.completionTokens ?? 0);
  const safeInput = Number.isFinite(rawInput) && rawInput > 0 ? rawInput : 0;
  const safeOutput = Number.isFinite(rawOutput) && rawOutput > 0 ? rawOutput : 0;
  let total = Number(usage?.totalTokens ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    total = safeInput + safeOutput;
  }
  return {
    input: safeInput,
    output: safeOutput,
    total,
  };
}

function getProviderHint(record: any): string | undefined {
  if (typeof record?.message?.provider === "string") {
    return record.message.provider;
  }
  if (typeof record?.message?.metadata?.provider === "string") {
    return record.message.metadata.provider;
  }
  if (typeof record?.provider === "string") {
    return record.provider;
  }
  if (typeof record?.source === "string") {
    return record.source;
  }
  return undefined;
}

function createTokenUsageAccumulator(): TokenUsageAccumulator {
  return {
    totals: { key: "TOTAL", input: 0, output: 0, total: 0 },
    byProvider: new Map(),
    byAgent: new Map(),
  };
}

function accumulateTokenUsage(acc: TokenUsageAccumulator, provider: ProviderName, agent: string, tokens: TokenCounts) {
  const hasTokens = tokens.input > 0 || tokens.output > 0 || tokens.total > 0;
  if (!hasTokens) {
    return;
  }

  acc.totals.input += tokens.input;
  acc.totals.output += tokens.output;
  acc.totals.total += tokens.total;

  const providerKey = provider ?? "Other";
  const providerGroup = acc.byProvider.get(providerKey) ?? { key: providerKey, input: 0, output: 0, total: 0 };
  providerGroup.input += tokens.input;
  providerGroup.output += tokens.output;
  providerGroup.total += tokens.total;
  acc.byProvider.set(providerKey, providerGroup);

  const agentKey = agent?.trim() || "UNSPECIFIED";
  const agentGroup = acc.byAgent.get(agentKey) ?? { key: agentKey, input: 0, output: 0, total: 0 };
  agentGroup.input += tokens.input;
  agentGroup.output += tokens.output;
  agentGroup.total += tokens.total;
  acc.byAgent.set(agentKey, agentGroup);
}

function finalizeTokenUsage(acc: TokenUsageAccumulator): TokenUsageSummary {
  return {
    totals: roundTokenUsageGroup(acc.totals),
    byProvider: mapTokenUsageGroups(acc.byProvider),
    byAgent: mapTokenUsageGroups(acc.byAgent),
  };
}

function mapTokenUsageGroups(collection: Map<string, TokenUsageGroup>): TokenUsageGroup[] {
  return Array.from(collection.values())
    .map((group) => roundTokenUsageGroup(group))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function roundTokenUsageGroup(group: TokenUsageGroup): TokenUsageGroup {
  return {
    key: group.key,
    input: Math.round(group.input),
    output: Math.round(group.output),
    total: Math.round(group.total),
  };
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
