import { TokenUsageGroup } from "@/types/expenses";

export type ProviderName = "Anthropic" | "OpenAI" | "OpenRouter" | "Google" | "MiniMax" | "Other";

export interface ModelPricingDefinition {
  id: string;
  label: string;
  provider: ProviderName;
  inputCostPerMillionUsd: number;
  outputCostPerMillionUsd: number;
  aliases?: string[];
}

interface ModelMatchResult {
  definition: ModelPricingDefinition;
  normalizedLabel: string;
}

export type TokenCounts = Pick<TokenUsageGroup, "input" | "output" | "total">;

const MODEL_PRICING_DEFINITIONS: ModelPricingDefinition[] = [
  {
    id: "gpt-5.1",
    label: "GPT-5.1",
    provider: "OpenAI",
    inputCostPerMillionUsd: 1.25,
    outputCostPerMillionUsd: 10,
    aliases: ["gpt5.1", "gpt-5-1", "gpt5-1", "gpt-5.1-pro", "gpt-5.1-standard"],
  },
  {
    id: "gpt-5.1-turbo",
    label: "GPT-5.1 Turbo",
    provider: "OpenAI",
    inputCostPerMillionUsd: 1.25,
    outputCostPerMillionUsd: 10,
    aliases: ["gpt5.1turbo", "gpt-5-1-turbo", "gpt5turbo"],
  },
  {
    id: "gpt-5.1-mini",
    label: "GPT-5.1 Mini",
    provider: "OpenAI",
    inputCostPerMillionUsd: 0.25,
    outputCostPerMillionUsd: 2,
    aliases: ["gpt5.1mini", "gpt-5-1-mini", "gpt5mini"],
  },
  {
    id: "gpt-5.1-codex",
    label: "GPT-5.1 Codex",
    provider: "OpenAI",
    inputCostPerMillionUsd: 1.25,
    outputCostPerMillionUsd: 10,
    aliases: ["gpt5.1codex", "gpt-5-1-codex", "gpt5codex"],
  },
  {
    id: "gpt-5.1-codex-mini",
    label: "GPT-5.1 Codex Mini",
    provider: "OpenAI",
    inputCostPerMillionUsd: 0.25,
    outputCostPerMillionUsd: 2,
    aliases: ["gpt5.1codexmini", "gpt-5-1-codex-mini"],
  },
  {
    id: "gpt-5.1-codex-max",
    label: "GPT-5.1 Codex Max",
    provider: "OpenAI",
    inputCostPerMillionUsd: 1.25,
    outputCostPerMillionUsd: 10,
    aliases: ["gpt5.1codexmax", "gpt-5-1-codex-max"],
  },
  {
    id: "gpt-5.2-codex",
    label: "GPT-5.2 Codex",
    provider: "OpenAI",
    inputCostPerMillionUsd: 1.75,
    outputCostPerMillionUsd: 14,
    aliases: ["gpt5.2codex", "gpt-5-2-codex"],
  },
  {
    id: "claude-opus-4",
    label: "Claude 4 Opus",
    provider: "Anthropic",
    inputCostPerMillionUsd: 15,
    outputCostPerMillionUsd: 75,
    aliases: ["claude4opus", "claude-opus", "claude-opus-4.0"],
  },
  {
    id: "claude-opus-4-6",
    label: "Claude 4.6 Opus",
    provider: "Anthropic",
    inputCostPerMillionUsd: 5,
    outputCostPerMillionUsd: 25,
    aliases: ["claude-opus-4-6", "claudeopus46", "claude 4.6 opus", "opus-4-6"],
  },
  {
    id: "claude-sonnet-4-5",
    label: "Claude 4.5 Sonnet",
    provider: "Anthropic",
    inputCostPerMillionUsd: 3,
    outputCostPerMillionUsd: 15,
    aliases: ["claude-sonnet-4.5", "claude45sonnet", "claude sonnet 4.5", "claude4.5sonnet"],
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude 4.5 Haiku",
    provider: "Anthropic",
    inputCostPerMillionUsd: 1,
    outputCostPerMillionUsd: 5,
    aliases: ["claude-haiku-4.5", "claude 4.5 haiku", "claude45haiku"],
  },
  {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    provider: "Google",
    inputCostPerMillionUsd: 2,
    outputCostPerMillionUsd: 12,
    aliases: ["gemini3.1pro", "gemini-3-pro", "gemini3pro"],
  },
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    provider: "Google",
    inputCostPerMillionUsd: 0.5,
    outputCostPerMillionUsd: 3,
    aliases: ["gemini3flash", "gemini-3.0-flash", "gemini flash 3"],
  },
  {
    id: "gemini-advanced",
    label: "Gemini Advanced",
    provider: "Google",
    inputCostPerMillionUsd: 1.25,
    outputCostPerMillionUsd: 5,
    aliases: ["gemini advanced", "gemini-adv", "gemini-pro-advanced"],
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "Google",
    inputCostPerMillionUsd: 3.5,
    outputCostPerMillionUsd: 10,
    aliases: ["gemini1.5pro", "gemini-1-5-pro", "gemini pro 1.5"],
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    provider: "Google",
    inputCostPerMillionUsd: 0.35,
    outputCostPerMillionUsd: 1.05,
    aliases: ["gemini1.5flash", "gemini-1-5-flash"],
  },
  {
    id: "minimax-m2.5",
    label: "MiniMax M2.5",
    provider: "MiniMax",
    inputCostPerMillionUsd: 0.15,
    outputCostPerMillionUsd: 1.2,
    aliases: ["minimax m2.5", "minimax-m2-5", "m2.5-standard"],
  },
  {
    id: "minimax-m2.5-lightning",
    label: "MiniMax M2.5 Lightning",
    provider: "MiniMax",
    inputCostPerMillionUsd: 0.3,
    outputCostPerMillionUsd: 2.4,
    aliases: ["minimax m2.5 lightning", "minimax-m2-5-lightning", "m2.5-lightning"],
  },
];

type OpenRouterOverrideDefinition = {
  label?: string;
  inputCostPerMillionUsd: number;
  outputCostPerMillionUsd: number;
};

const OPENROUTER_MODEL_OVERRIDES = new Map<string, OpenRouterOverrideDefinition>([
  [normalizeModelKey("claude-sonnet-4-6"), { label: "Claude 4.6 Sonnet (OpenRouter)", inputCostPerMillionUsd: 3.45, outputCostPerMillionUsd: 17.25 }],
  [normalizeModelKey("claude-haiku-4-5"), { label: "Claude 4.5 Haiku (OpenRouter)", inputCostPerMillionUsd: 1.15, outputCostPerMillionUsd: 5.75 }],
  [normalizeModelKey("auto"), { label: "OpenRouter Auto", inputCostPerMillionUsd: 3, outputCostPerMillionUsd: 15 }],
]);

const NORMALIZED_ALIAS_MAP = new Map<string, ModelPricingDefinition>();
const NORMALIZED_ALIAS_ENTRIES: Array<[string, ModelPricingDefinition]> = [];

for (const def of MODEL_PRICING_DEFINITIONS) {
  const aliases = new Set<string>([def.id, def.label, ...(def.aliases ?? [])]);
  for (const alias of aliases) {
    const normalized = normalizeModelKey(alias);
    NORMALIZED_ALIAS_MAP.set(normalized, def);
  }
}
NORMALIZED_ALIAS_ENTRIES.push(...NORMALIZED_ALIAS_MAP.entries());

function maybeApplyOpenRouterPricing(rawModel: string, baseMatch?: ModelMatchResult): ModelMatchResult | undefined {
  const lowered = rawModel.toLowerCase();
  if (!lowered.includes("openrouter/")) {
    return baseMatch;
  }

  const { baseKey } = stripProviderPrefixes(rawModel);
  const normalizedBase = normalizeModelKey(baseKey || rawModel);
  const override = OPENROUTER_MODEL_OVERRIDES.get(normalizedBase);
  if (!override) {
    return baseMatch;
  }

  const label = override.label ?? baseMatch?.definition.label ?? toTitleCase(baseKey || rawModel);
  const definition: ModelPricingDefinition = {
    id: `${normalizedBase}-openrouter`,
    label,
    provider: "OpenRouter",
    inputCostPerMillionUsd: override.inputCostPerMillionUsd,
    outputCostPerMillionUsd: override.outputCostPerMillionUsd,
    aliases: baseMatch?.definition.aliases,
  };

  return { definition, normalizedLabel: label };
}

export function matchModelPricing(rawModel?: string | null): ModelMatchResult | undefined {
  if (!rawModel) return undefined;
  const trimmed = rawModel.trim();
  if (!trimmed) return undefined;

  const normalized = normalizeModelKey(trimmed);
  const direct = NORMALIZED_ALIAS_MAP.get(normalized);
  if (direct) {
    return maybeApplyOpenRouterPricing(trimmed, { definition: direct, normalizedLabel: direct.label });
  }

  const { baseKey } = stripProviderPrefixes(trimmed);
  const normalizedBase = normalizeModelKey(baseKey);
  const fallbackDirect = NORMALIZED_ALIAS_MAP.get(normalizedBase);
  if (fallbackDirect) {
    return maybeApplyOpenRouterPricing(trimmed, { definition: fallbackDirect, normalizedLabel: fallbackDirect.label });
  }

  let bestMatch: { def: ModelPricingDefinition; distance: number } | null = null;
  for (const [aliasKey, def] of NORMALIZED_ALIAS_ENTRIES) {
    const distance = levenshtein(normalized, aliasKey);
    const allowed = Math.max(2, Math.floor(aliasKey.length * 0.15));
    if (distance <= allowed) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { def, distance };
      }
    }
  }

  if (bestMatch) {
    return maybeApplyOpenRouterPricing(trimmed, { definition: bestMatch.def, normalizedLabel: bestMatch.def.label });
  }

  if (normalizedBase !== normalized) {
    for (const [aliasKey, def] of NORMALIZED_ALIAS_ENTRIES) {
      const distance = levenshtein(normalizedBase, aliasKey);
      const allowed = Math.max(2, Math.floor(aliasKey.length * 0.15));
      if (distance <= allowed) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { def, distance };
        }
      }
    }
    if (bestMatch) {
      return maybeApplyOpenRouterPricing(trimmed, { definition: bestMatch.def, normalizedLabel: bestMatch.def.label });
    }
  }

  return maybeApplyOpenRouterPricing(trimmed);
}

export function canonicalizeModelLabel(
  rawModel?: string | null,
  providerHint?: string | null,
): { label: string; provider: ProviderName; pricing?: ModelPricingDefinition } {
  if (!rawModel) {
    return { label: "UNSPECIFIED", provider: providerHint ? normalizeProvider(providerHint) : "Other" };
  }

  const match = matchModelPricing(rawModel);
  if (match) {
    return {
      label: match.definition.label,
      provider: match.definition.provider,
      pricing: match.definition,
    };
  }

  const { baseKey, providerHint: derivedProviderHint } = stripProviderPrefixes(rawModel);
  const provider = normalizeProvider(providerHint) !== "Other"
    ? normalizeProvider(providerHint)
    : derivedProviderHint ?? detectProviderFromModel(rawModel);
  return { label: toTitleCase(baseKey || rawModel), provider };
}

export function detectProviderFromModel(rawModel?: string | null, providerHint?: string | null): ProviderName {
  const hinted = normalizeProvider(providerHint);
  if (hinted !== "Other") {
    return hinted;
  }

  if (!rawModel) {
    return "Other";
  }

  const lowered = rawModel.toLowerCase();
  if (lowered.includes("openrouter/")) {
    return "OpenRouter";
  }
  if (/(anthropic|claude)/.test(lowered)) {
    return "Anthropic";
  }
  if (/(openai|gpt\-5|gpt5|o1|o3)/.test(lowered)) {
    return "OpenAI";
  }
  if (/(gemini|google|palm|bard)/.test(lowered)) {
    return "Google";
  }
  if (/(minimax|abab|m2\.5|m25|abab)/.test(lowered)) {
    return "MiniMax";
  }
  return "Other";
}

export function normalizeProvider(providerHint?: string | null): ProviderName {
  if (!providerHint) return "Other";
  const lowered = providerHint.toLowerCase();
  if (lowered.includes("anthropic")) return "Anthropic";
  if (lowered.includes("openai")) return "OpenAI";
  if (lowered.includes("openrouter")) return "OpenRouter";
  if (lowered.includes("google") || lowered.includes("gemini")) return "Google";
  if (lowered.includes("minimax")) return "MiniMax";
  return "Other";
}

export function estimateUsdCostFromTokens(tokens: TokenCounts, pricing?: ModelPricingDefinition | null): number | undefined {
  if (!pricing) return undefined;
  const inputUsd = (tokens.input / 1_000_000) * pricing.inputCostPerMillionUsd;
  const outputUsd = (tokens.output / 1_000_000) * pricing.outputCostPerMillionUsd;
  const total = inputUsd + outputUsd;
  if (!Number.isFinite(total) || total <= 0) {
    return undefined;
  }
  return Math.round(total * 10000) / 10000;
}

function stripProviderPrefixes(rawModel: string) {
  const parts = rawModel.split("/");
  if (parts.length <= 1) {
    return { baseKey: rawModel, providerHint: undefined };
  }

  const providerCandidate = parts[0];
  const provider = normalizeProvider(providerCandidate);
  return { baseKey: parts[parts.length - 1] ?? rawModel, providerHint: provider !== "Other" ? provider : undefined };
}

function normalizeModelKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/openrouter/g, "")
    .replace(/anthropic/g, "")
    .replace(/google/g, "")
    .replace(/openai/g, "")
    .replace(/mini\s*max/g, "minimax")
    .trim();
}

function toTitleCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ") || value.toUpperCase();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}
