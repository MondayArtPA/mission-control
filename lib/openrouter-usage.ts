const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/auth/key";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const USD_TO_THB = 36;

type CacheEntry = {
  data: OpenRouterActualSpend;
  expiresAt: number;
};

let cacheEntry: CacheEntry | null = null;
let inflight: Promise<OpenRouterActualSpend> | null = null;

export interface OpenRouterActualSpend {
  usdTotal: number;
  thbTotal: number;
  fetchedAt: string;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIsoString(input?: string | Date): string {
  if (input instanceof Date) {
    return input.toISOString();
  }

  if (typeof input === "string") {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

async function fetchOpenRouterUsage(): Promise<OpenRouterActualSpend> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter usage request failed (${response.status}): ${text || response.statusText}`);
  }

  const payload = await response.json().catch((error: unknown) => {
    throw new Error(`Failed to parse OpenRouter usage response: ${(error as Error)?.message ?? String(error)}`);
  });

  const usageUsd = Number(payload?.data?.usage ?? payload?.usage);
  if (!Number.isFinite(usageUsd)) {
    throw new Error("OpenRouter usage response missing numeric usage");
  }

  const normalizedUsd = roundCurrency(Math.max(usageUsd, 0));
  const fetchedAt = new Date().toISOString();

  return {
    usdTotal: normalizedUsd,
    thbTotal: roundCurrency(normalizedUsd * USD_TO_THB),
    fetchedAt,
  };
}

export async function getOpenRouterActualSpend(options?: { forceRefresh?: boolean }): Promise<OpenRouterActualSpend> {
  const forceRefresh = options?.forceRefresh ?? false;
  const now = Date.now();

  if (!forceRefresh && cacheEntry && cacheEntry.expiresAt > now) {
    return cacheEntry.data;
  }

  if (!forceRefresh && inflight) {
    return inflight;
  }

  try {
    inflight = fetchOpenRouterUsage();
    const result = await inflight;
    inflight = null;

    if (result) {
      cacheEntry = {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    }

    return result;
  } catch (error) {
    inflight = null;
    cacheEntry = null;
    if (forceRefresh) {
      throw error;
    }
    throw error;
  }
}

export function primeOpenRouterActualCache(input: { usdTotal: number; fetchedAt?: string | Date }) {
  const normalizedUsd = roundCurrency(Math.max(Number(input.usdTotal) || 0, 0));
  const fetchedAt = toIsoString(input.fetchedAt);

  const data: OpenRouterActualSpend = {
    usdTotal: normalizedUsd,
    thbTotal: roundCurrency(normalizedUsd * USD_TO_THB),
    fetchedAt,
  };

  cacheEntry = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}
