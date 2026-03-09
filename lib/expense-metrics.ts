import fs from "fs/promises";
import path from "path";
import {
  CategoryBreakdown,
  ExpenseBreakdownItem,
  ExpenseBreakdownResponse,
  ExpenseBreakdownWithShare,
  ExpenseBudgetStatus,
  ExpenseMissionControlMetrics,
  ExpenseSummaryApiPayload,
  MonthlyExpenseSummary,
} from "@/types/expenses";
import { ExpenseLogEntry, parseSessionExpenses } from "@/lib/expense-session-parser";

const LOG_TIMEZONE = "Asia/Bangkok";
const LOG_DIR = process.env.EXPENSE_LOG_DIR ?? path.join(process.env.HOME ?? "", ".openclaw", "logs");
const LOG_FILE_REGEX = /^\d{4}-\d{2}-\d{2}\.md$/;
const MONTH_INPUT_REGEX = /^\d{4}-\d{2}$/;
const BUDGET_BAHT = 1500;
const ALERT_THRESHOLD = 1275; // 85% of budget
const RESTRICT_THRESHOLD = 1425; // 95% of budget
const DEFAULT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: LOG_TIMEZONE, year: "numeric", month: "2-digit" });
const DEFAULT_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOG_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

interface BreakdownMaps {
  byCategory: ExpenseBreakdownWithShare[];
  byAgent: ExpenseBreakdownWithShare[];
  byModel: ExpenseBreakdownWithShare[];
}

interface ParseStats {
  filesScanned: number;
  daysProcessed: string[];
  ignoredNoAmount: number;
  ignoredCurrency: number;
}

interface EntriesResult {
  entries: ExpenseLogEntry[];
  stats: ParseStats;
  range: { start: Date; end: Date; isMonthToDate: boolean };
  month: string;
  expectedDays: string[];
}

export class ExpenseMetricsError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ExpenseMetricsError";
    this.status = status;
  }
}

export async function buildExpenseMetricsSummary(month?: string, now = new Date()): Promise<ExpenseSummaryApiPayload> {
  const result = await loadEntries(month, now);
  const breakdowns = buildBreakdowns(result.entries, result.entries.reduce((sum, entry) => sum + entry.amount, 0));
  const summary = buildMonthlySummaryFromEntries(result, breakdowns);
  const metrics = buildMissionControlMetrics(result, breakdowns.byCategory, breakdowns.byAgent, breakdowns.byModel);

  return {
    ...summary,
    metrics,
  };
}

export async function buildExpenseBreakdownResponse(
  dimension: "agent" | "model",
  month?: string,
  now = new Date()
): Promise<ExpenseBreakdownResponse> {
  const result = await loadEntries(month, now);
  const total = roundCurrency(result.entries.reduce((sum, entry) => sum + entry.amount, 0));
  const breakdowns = buildBreakdowns(result.entries, total);
  const breakdown = dimension === "agent" ? breakdowns.byAgent : breakdowns.byModel;

  return {
    month: result.month,
    currency: "THB",
    total,
    breakdown,
    stats: {
      entries: result.entries.length,
      filesScanned: result.stats.filesScanned,
      ignoredEntries: result.stats.ignoredNoAmount + result.stats.ignoredCurrency,
    },
  };
}

async function loadEntries(monthInput: string | undefined, now: Date): Promise<EntriesResult> {
  const targetMonth = normalizeMonth(monthInput, now);
  const range = getMonthRange(targetMonth, now);

  const files = await readLogDirSafe();
  const prefix = `${targetMonth}-`;
  const monthFiles = files.filter((file) => LOG_FILE_REGEX.test(file) && file.startsWith(prefix)).sort();

  const entries: ExpenseLogEntry[] = [];
  const stats: ParseStats = {
    filesScanned: 0,
    daysProcessed: [],
    ignoredNoAmount: 0,
    ignoredCurrency: 0,
  };
  const daysSet = new Set<string>();

  for (const fileName of monthFiles) {
    const day = fileName.replace(".md", "");
    const filePath = path.join(LOG_DIR, fileName);
    let content: string;

    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      console.warn(`[expense-metrics] Failed to read ${filePath}:`, error);
      continue;
    }

    stats.filesScanned += 1;
    daysSet.add(day);

    const { entries: dayEntries, ignoredCurrency, ignoredNoAmount } = parseDailyLog(content, day);
    stats.ignoredCurrency += ignoredCurrency;
    stats.ignoredNoAmount += ignoredNoAmount;

    for (const entry of dayEntries) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= range.start && entryDate < range.end) {
        entries.push(entry);
      }
    }
  }

  const expectedDays = buildExpectedDays(targetMonth, range, now);
  stats.daysProcessed = Array.from(daysSet).sort();

  return {
    entries,
    stats,
    range,
    month: targetMonth,
    expectedDays,
  };
}

function parseDailyLog(content: string, day: string) {
  const lines = content.split(/\r?\n/);
  const entries: ExpenseLogEntry[] = [];
  let ignoredNoAmount = 0;
  let ignoredCurrency = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) {
      continue;
    }

    // Skip synthetic recap lines (e.g. "(฿476.60 MTD)") so they don't double count real spend
    if (/\b(?:MTD|YTD|month-to-date|year-to-date)\b/i.test(line)) {
      continue;
    }

    const parsed = parseLogLine(line, day);
    if (!parsed) {
      continue;
    }

    if (parsed.kind === "ignored-no-amount") {
      ignoredNoAmount += 1;
    } else if (parsed.kind === "ignored-currency") {
      ignoredCurrency += 1;
    } else if (parsed.kind === "entry") {
      entries.push(parsed.entry);
    }
  }

  return { entries, ignoredNoAmount, ignoredCurrency };
}

function parseLogLine(line: string, day: string):
  | { kind: "entry"; entry: ExpenseLogEntry }
  | { kind: "ignored-no-amount" }
  | { kind: "ignored-currency" }
  | null {
  const match = line.match(/^\-\s*\[(\d{2}:\d{2})\]\s*\[([^\]]+)\]\s*(.+)$/);
  if (!match) {
    return null;
  }

  const time = match[1];
  const agent = match[2];
  const rest = match[3];
  const amountInfo = extractAmount(rest);

  if (!amountInfo) {
    return { kind: "ignored-no-amount" };
  }

  if (amountInfo.currency !== "THB") {
    return { kind: "ignored-currency" };
  }

  const metadata = extractMetadata(rest);
  const category = metadata.category ?? inferCategory(rest);
  const model = metadata.model ?? detectModel(rest);
  const timestamp = buildTimestamp(day, time);

  return {
    kind: "entry",
    entry: {
      timestamp,
      day,
      agent: (metadata.agent ?? agent).trim(),
      model: model?.trim(),
      category,
      amount: roundCurrency(amountInfo.amount),
      currency: amountInfo.currency,
      sourceLine: line,
    },
  };
}

function extractAmount(text: string): { amount: number; currency: string } | undefined {
  const patterns = [
    { regex: /฿\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i, currency: "THB" },
    { regex: /THB\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i, currency: "THB" },
    { regex: /USD\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i, currency: "USD" },
    { regex: /\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i, currency: "USD" },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const amount = Number(match[1].replace(/,/g, ""));
      if (!Number.isNaN(amount) && amount > 0) {
        return { amount, currency: pattern.currency };
      }
    }
  }

  return undefined;
}

function extractMetadata(text: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const tagRegex = /\[([^:\]]+):\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  // eslint-disable-next-line no-cond-assign
  while ((match = tagRegex.exec(text)) !== null) {
    const key = match[1]?.trim().toLowerCase();
    const value = match[2]?.trim();
    if (key && value) {
      metadata[key] = value;
    }
  }

  return metadata;
}

function detectModel(text: string): string | undefined {
  const modelRegex = /\b(?:GPT|Claude|Gemini|Haiku|Sonnet|Opus|Llama|Mistral|PaLM|Phi)[A-Za-z0-9\.\- ]*/gi;
  const matches = text.match(modelRegex);
  if (!matches || matches.length === 0) {
    return undefined;
  }

  return matches.sort((a, b) => b.length - a.length)[0];
}

function inferCategory(text: string): string {
  const normalized = text.toLowerCase();
  if (/research|scan|analysis/.test(normalized)) {
    return "analysis";
  }
  if (/dev|build|code|ship|deploy|schema/.test(normalized)) {
    return "dev";
  }
  if (/comm|brief|slack|email|update/.test(normalized)) {
    return "comms";
  }
  if (/exec|lead|review|approval/.test(normalized)) {
    return "exec";
  }
  return "model-usage";
}

function buildTimestamp(day: string, time: string) {
  return new Date(`${day}T${time}:00+07:00`).toISOString();
}

function buildBreakdowns(entries: ExpenseLogEntry[], totalAmount: number): BreakdownMaps {
  const byCategory = createBreakdown(entries, (entry) => entry.category, totalAmount);
  const byAgent = createBreakdown(entries, (entry) => entry.agent, totalAmount);
  const byModel = createBreakdown(entries, (entry) => entry.model ?? "UNSPECIFIED", totalAmount);

  return {
    byCategory,
    byAgent,
    byModel,
  };
}

function createBreakdown(
  entries: ExpenseLogEntry[],
  selector: (entry: ExpenseLogEntry) => string,
  totalAmount: number
): ExpenseBreakdownWithShare[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const entry of entries) {
    const key = selector(entry).trim() || "UNSPECIFIED";
    const current = map.get(key) ?? { total: 0, count: 0 };
    current.total += entry.amount;
    current.count += 1;
    map.set(key, current);
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({
      key,
      total: roundCurrency(value.total),
      count: value.count,
      percent: totalAmount > 0 ? Math.round((value.total / totalAmount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function buildMonthlySummaryFromEntries(result: EntriesResult, breakdowns: BreakdownMaps): MonthlyExpenseSummary {
  const totalExpense = roundCurrency(result.entries.reduce((sum, entry) => sum + entry.amount, 0));
  const categoryBreakdown: CategoryBreakdown[] = breakdowns.byCategory.map((item) => ({
    category: item.key,
    total: item.total,
    count: item.count,
  }));

  return {
    month: result.month,
    periodStart: result.range.start.toISOString(),
    periodEndExclusive: result.range.end.toISOString(),
    isMonthToDate: result.range.isMonthToDate,
    totalExpense,
    count: result.entries.length,
    categoryBreakdown,
    breakdown: {
      byAgent: breakdowns.byAgent.map(trimShare),
      byCategory: breakdowns.byCategory.map(trimShare),
      byModel: breakdowns.byModel.map(trimShare),
    },
  };
}

function trimShare(item: ExpenseBreakdownWithShare): ExpenseBreakdownItem {
  return {
    key: item.key,
    total: item.total,
    count: item.count,
  };
}

function buildMissionControlMetrics(
  result: EntriesResult,
  byCategory: ExpenseBreakdownWithShare[],
  byAgent: ExpenseBreakdownWithShare[],
  byModel: ExpenseBreakdownWithShare[]
): ExpenseMissionControlMetrics {
  const totalSpent = roundCurrency(result.entries.reduce((sum, entry) => sum + entry.amount, 0));
  const status = resolveBudgetStatus(totalSpent);
  const remaining = roundCurrency(BUDGET_BAHT - totalSpent);
  const usagePct = BUDGET_BAHT > 0 ? Math.round((totalSpent / BUDGET_BAHT) * 1000) / 10 : 0;
  const dailyTotals = buildDailyTotals(result.entries);

  return {
    currency: "THB",
    totals: {
      budget: BUDGET_BAHT,
      alertThreshold: ALERT_THRESHOLD,
      restrictThreshold: RESTRICT_THRESHOLD,
      spent: totalSpent,
      remaining: Math.max(remaining, 0),
      usagePct,
      status,
    },
    counts: {
      entries: result.entries.length,
      daysWithSpend: dailyTotals.length,
      filesScanned: result.stats.filesScanned,
      ignoredEntries: result.stats.ignoredCurrency + result.stats.ignoredNoAmount,
    },
    trend: {
      daily: buildDailyTrend(dailyTotals),
    },
    logs: {
      daysProcessed: result.stats.daysProcessed,
      missingDays: result.expectedDays.filter((day) => !result.stats.daysProcessed.includes(day)),
    },
    breakdown: {
      byCategory,
      byAgent,
      byModel,
    },
  } as ExpenseMissionControlMetrics;
}

function buildDailyTotals(entries: ExpenseLogEntry[]): { date: string; total: number }[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const current = map.get(entry.day) ?? 0;
    map.set(entry.day, current + entry.amount);
  }

  return Array.from(map.entries())
    .map(([date, total]) => ({ date, total: roundCurrency(total) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildDailyTrend(dailyTotals: { date: string; total: number }[]) {
  let cumulative = 0;
  return dailyTotals.map((point) => {
    cumulative = roundCurrency(cumulative + point.total);
    return {
      ...point,
      cumulative,
    };
  });
}

function resolveBudgetStatus(totalSpent: number): ExpenseBudgetStatus {
  if (totalSpent >= BUDGET_BAHT) {
    return "over";
  }
  if (totalSpent >= RESTRICT_THRESHOLD) {
    return "restrict";
  }
  if (totalSpent >= ALERT_THRESHOLD) {
    return "alert";
  }
  return "normal";
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeMonth(monthInput: string | undefined, now: Date): string {
  if (monthInput) {
    if (!MONTH_INPUT_REGEX.test(monthInput)) {
      throw new ExpenseMetricsError("Month must use YYYY-MM format", 400);
    }
    return monthInput;
  }

  return DEFAULT_MONTH_FORMATTER.format(now);
}

function getMonthRange(month: string, now: Date) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  const monthStringForNow = DEFAULT_MONTH_FORMATTER.format(now);
  const isMonthToDate = monthStringForNow === month;
  const end = isMonthToDate && now < nextMonthStart ? now : nextMonthStart;

  return { start, end, isMonthToDate };
}

async function readLogDirSafe() {
  try {
    return await fs.readdir(LOG_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function buildExpectedDays(month: string, range: { isMonthToDate: boolean }, now: Date): string[] {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNumber = Number(monthStr);
  const totalDays = new Date(year, monthNumber, 0).getDate();

  let dayLimit = totalDays;
  if (range.isMonthToDate) {
    const localNow = DEFAULT_DATE_FORMATTER.format(now).split("-");
    const currentMonth = Number(localNow[1]);
    const currentYear = Number(localNow[0]);
    const currentDay = Number(localNow[2]);
    if (currentYear === year && currentMonth === monthNumber) {
      dayLimit = currentDay;
    }
  }

  const expected: string[] = [];
  for (let day = 1; day <= dayLimit; day += 1) {
    expected.push(`${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`);
  }

  return expected;
}
