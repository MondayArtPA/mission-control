import fs from "fs/promises";
import path from "path";

import { primeOpenRouterActualCache } from "@/lib/openrouter-usage";

const BANGKOK_TZ = "Asia/Bangkok";
const USD_TO_THB = Number(process.env.EXPENSES_USD_TO_THB ?? 36);
const LOG_ROOT = path.join(process.env.HOME ?? "", ".openclaw", "logs");
const LOG_FILE_PREFIX = "provider-sync-";
const LOG_AGENT_LABEL = "PROVIDER_SYNC";

type ProviderId = "anthropic" | "openrouter" | "openai";

type ProviderSyncStatus = {
  id: ProviderId;
  label: string;
  usdTotal: number;
  thbTotal: number;
  skipped: boolean;
  message?: string;
  error?: string;
};

export type ProviderSyncResult = {
  month: string;
  range: { startDate: string; endDate: string };
  totals: { usd: number; thb: number };
  providers: ProviderSyncStatus[];
  loggedProviders: ProviderSyncStatus[];
  logPath?: string;
};

export async function syncProviderCosts(now = new Date()): Promise<ProviderSyncResult> {
  const range = getBangkokMonthRange(now);
  const providers = await Promise.all([
    fetchAnthropicCosts(range),
    fetchOpenRouterCosts(range),
    fetchOpenAICosts(range),
  ]);

  const loggedProviders = providers.filter((provider) => !provider.skipped && provider.usdTotal > 0 && !provider.error);

  let logPath: string | undefined;
  if (loggedProviders.length > 0) {
    logPath = await appendProviderLog(loggedProviders, now, range);
  }

  const totalsUsd = loggedProviders.reduce((sum, provider) => sum + provider.usdTotal, 0);
  const totalsThb = roundCurrency(totalsUsd * USD_TO_THB);

  return {
    month: range.month,
    range: { startDate: range.startDate, endDate: range.endDate },
    totals: { usd: totalsUsd, thb: totalsThb },
    providers,
    loggedProviders,
    logPath,
  };
}

function getBangkokMonthRange(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.format(date).split("-");
  const [year, month, day] = parts;
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${day}`;
  const monthKey = `${year}-${month}`;

  return { month: monthKey, startDate, endDate };
}

async function fetchAnthropicCosts(range: { startDate: string; endDate: string }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      id: "anthropic" as const,
      label: "Anthropic",
      usdTotal: 0,
      thbTotal: 0,
      skipped: true,
      message: "Missing ANTHROPIC_API_KEY",
    } satisfies ProviderSyncStatus;
  }

  const url = new URL("https://api.anthropic.com/v1/organization/costs");
  url.searchParams.set("start_date", range.startDate);
  url.searchParams.set("end_date", range.endDate);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    });

    const payload = await parseJson(response);
    const totalUsd = extractAnthropicUsd(payload);

    return buildProviderStatus("anthropic", "Anthropic", totalUsd);
  } catch (error) {
    return buildProviderError("anthropic", "Anthropic", error);
  }
}

async function fetchOpenRouterCosts(range: { startDate: string; endDate: string }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      id: "openrouter" as const,
      label: "OpenRouter",
      usdTotal: 0,
      thbTotal: 0,
      skipped: true,
      message: "Missing OPENROUTER_API_KEY",
    } satisfies ProviderSyncStatus;
  }

  const url = "https://openrouter.ai/api/v1/auth/key";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const payload = await parseJson(response);
    const totalUsd = extractOpenRouterUsd(payload);
    const status = buildProviderStatus("openrouter", "OpenRouter", totalUsd);

    primeOpenRouterActualCache({ usdTotal: totalUsd });

    return status;
  } catch (error) {
    return buildProviderError("openrouter", "OpenRouter", error);
  }
}

async function fetchOpenAICosts(range: { startDate: string; endDate: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      id: "openai" as const,
      label: "OpenAI",
      usdTotal: 0,
      thbTotal: 0,
      skipped: true,
      message: "Missing OPENAI_API_KEY",
    } satisfies ProviderSyncStatus;
  }

  const url = new URL("https://api.openai.com/v1/usage");
  url.searchParams.set("start_date", range.startDate);
  url.searchParams.set("end_date", range.endDate);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const payload = await parseJson(response);
    const totalUsd = extractOpenAiUsd(payload);

    return buildProviderStatus("openai", "OpenAI", totalUsd);
  } catch (error) {
    return buildProviderError("openai", "OpenAI", error);
  }
}

async function parseJson(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
  }
}

function buildProviderStatus(id: ProviderId, label: string, usdTotal: number): ProviderSyncStatus {
  const normalizedUsd = roundCurrency(Math.max(usdTotal, 0));
  return {
    id,
    label,
    usdTotal: normalizedUsd,
    thbTotal: roundCurrency(normalizedUsd * USD_TO_THB),
    skipped: false,
  };
}

function buildProviderError(id: ProviderId, label: string, error: unknown): ProviderSyncStatus {
  return {
    id,
    label,
    usdTotal: 0,
    thbTotal: 0,
    skipped: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

function extractAnthropicUsd(payload: any): number {
  if (!payload) return 0;
  if (typeof payload.total_cost_usd === "number") return payload.total_cost_usd;
  if (typeof payload.totalUsd === "number") return payload.totalUsd;
  if (typeof payload.total_usd === "number") return payload.total_usd;

  if (Array.isArray(payload.data)) {
    const sum = payload.data.reduce((acc: number, item: any) => {
      const total = toNumber(item?.total_cost_usd ?? item?.total_usd ?? item?.cost_usd ?? item?.usd);
      return acc + (total ?? 0);
    }, 0);
    if (sum > 0) {
      return sum;
    }
  }

  return toNumber(payload?.cost_usd ?? payload?.usd ?? payload?.total) ?? 0;
}

function extractOpenRouterUsd(payload: any): number {
  if (!payload) return 0;

  const usageValue = toNumber(payload?.data?.usage ?? payload?.data?.total_usage ?? payload?.usage ?? payload?.total_usage);
  if (typeof usageValue === "number") {
    return usageValue;
  }

  if (Array.isArray(payload.data)) {
    const sum = payload.data.reduce((acc: number, item: any) => {
      const total = toNumber(item?.usd_total ?? item?.total_usd ?? item?.total_cost ?? item?.cost_usd ?? item?.usd);
      return acc + (total ?? 0);
    }, 0);
    if (sum > 0) {
      return sum;
    }
  } else if (payload?.data && typeof payload.data === "object") {
    const nested = toNumber(
      payload.data?.usd_total ?? payload.data?.total_usd ?? payload.data?.total_cost ?? payload.data?.usd ?? payload.data?.usage
    );
    if (typeof nested === "number") {
      return nested;
    }
  }

  return toNumber(payload?.usd_total ?? payload?.total_usd ?? payload?.total_cost ?? payload?.usd) ?? 0;
}

function extractOpenAiUsd(payload: any): number {
  if (!payload) return 0;

  if (Array.isArray(payload.data)) {
    const sum = payload.data.reduce((acc: number, item: any) => {
      let total = toNumber(item?.cost ?? item?.total_usd ?? item?.usd_total);
      if (total === undefined && Array.isArray(item?.line_items)) {
        total = item.line_items.reduce((lineSum: number, line: any) => {
          const lineCost = toNumber(line?.cost ?? line?.usd ?? line?.total);
          return lineSum + (lineCost ?? 0);
        }, 0);
      }

      if (total === undefined && typeof item?.aggregation === "object") {
        total = toNumber(item.aggregation?.total_usd ?? item.aggregation?.total_cost);
      }

      return acc + (total ?? 0);
    }, 0);

    if (sum > 0) {
      return sum;
    }
  }

  if (typeof payload.total_usage === "object") {
    const total = toNumber(payload.total_usage?.usd ?? payload.total_usage?.total);
    if (typeof total === "number") {
      return total;
    }
  }

  return toNumber(payload?.total_usage ?? payload?.total_cost ?? payload?.total_usd) ?? 0;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

async function appendProviderLog(providers: ProviderSyncStatus[], now: Date, range: { month: string }) {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const currentDate = dateFormatter.format(now);
  const timeLabel = timeFormatter.format(now);
  const monthDisplay = new Date(`${range.month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const logFileName = `${LOG_FILE_PREFIX}${currentDate}.md`;
  const logPath = path.join(LOG_ROOT, logFileName);

  await fs.mkdir(LOG_ROOT, { recursive: true });

  let content = "";
  if (!(await fileExists(logPath))) {
    content += `# Provider Cost Sync — ${currentDate} (Bangkok)\n\n`;
  }

  for (const provider of providers) {
    const line = buildLogLine({
      timeLabel,
      provider,
      monthDisplay,
    });
    content += `${line}\n`;
  }

  await fs.appendFile(logPath, content, "utf-8");
  return logPath;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildLogLine({
  timeLabel,
  provider,
  monthDisplay,
}: {
  timeLabel: string;
  provider: ProviderSyncStatus;
  monthDisplay: string;
}) {
  const thbDisplay = provider.thbTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdDisplay = provider.usdTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `- [${timeLabel}] [${LOG_AGENT_LABEL}] ${provider.label} API spend for ${monthDisplay} (฿${thbDisplay}) [category: model-usage] [provider: ${provider.label}] [currency: USD] [amount_usd: ${usdDisplay}]`;
}
