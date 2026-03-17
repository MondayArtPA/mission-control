import fs from "fs/promises";
import path from "path";
import type { AgentName, PriorityLevel, TaskRecord, TaskStatus } from "@/types/task";
import { PRIORITY_META } from "@/types/task";

interface TelegramAgentConfig {
  botToken: string;
  chatId: string;
}

interface TelegramAgentEntry {
  botToken?: string | number | null;
  bot_token?: string | number | null;
  chatId?: string | number | null;
  chat_id?: string | number | null;
}

interface TelegramConfigFile {
  chatId?: string | number | null;
  agents: Record<string, TelegramAgentEntry>;
}

type LegacyBotsFile = Record<
  string,
  {
    botToken?: string | number;
    bot_token?: string | number;
    chatId?: string | number;
    chat_id?: string | number;
  }
>;

const CONFIG_PATH = path.join(process.cwd(), "data", "telegram-config.json");
const LEGACY_BOTS_PATH = process.env.HOME
  ? path.join(process.env.HOME, ".openclaw", "workspace", "comms", "bots.json")
  : null;

let cachedConfig: TelegramConfigFile | null = null;
let cacheMtime: number | null = null;
let cachedLegacyBots: LegacyBotsFile | null = null;
let cachedLegacyMtime: number | null = null;

const AGENT_LEGACY_ALIASES: Partial<Record<AgentName, string[]>> = {
  monday: ["monday", "main"],
};

async function loadTelegramConfig(): Promise<TelegramConfigFile | null> {
  try {
    const stats = await fs.stat(CONFIG_PATH);
    if (!cachedConfig || !cacheMtime || stats.mtimeMs !== cacheMtime) {
      const raw = await fs.readFile(CONFIG_PATH, "utf-8");
      cachedConfig = JSON.parse(raw);
      cacheMtime = stats.mtimeMs;
    }
    return cachedConfig;
  } catch {
    return null;
  }
}

async function loadLegacyBotsConfig(): Promise<LegacyBotsFile | null> {
  if (!LEGACY_BOTS_PATH) return null;
  try {
    const stats = await fs.stat(LEGACY_BOTS_PATH);
    if (!cachedLegacyBots || !cachedLegacyMtime || stats.mtimeMs !== cachedLegacyMtime) {
      const raw = await fs.readFile(LEGACY_BOTS_PATH, "utf-8");
      cachedLegacyBots = JSON.parse(raw);
      cachedLegacyMtime = stats.mtimeMs;
    }
    return cachedLegacyBots;
  } catch {
    return null;
  }
}

function resolveValue(value?: string | number | null): string | null {
  if (value === undefined || value === null) return null;
  const normalized = typeof value === "number" ? value.toString() : value;
  if (!normalized) return null;
  if (normalized.startsWith("ENV:")) {
    const key = normalized.slice(4).trim();
    return process.env[key] ?? null;
  }
  return normalized;
}

function normalizeCredentials(entry?: TelegramAgentEntry, fallbackChatId?: string | number | null): TelegramAgentConfig | null {
  if (!entry) return null;
  const botToken = resolveValue(entry.botToken ?? entry.bot_token ?? null);
  const fallbackChat = resolveValue(fallbackChatId ?? null);
  const chatId = resolveValue(entry.chatId ?? entry.chat_id ?? null) ?? fallbackChat;
  if (!botToken || !chatId) {
    return null;
  }
  return { botToken, chatId };
}

export async function getAgentTelegramConfig(agentId: AgentName): Promise<TelegramAgentConfig | null> {
  const config = await loadTelegramConfig();
  const primaryCredentials = normalizeCredentials(config?.agents?.[agentId], config?.chatId ?? null);
  if (primaryCredentials) {
    return primaryCredentials;
  }

  const legacyConfig = await loadLegacyBotsConfig();
  if (!legacyConfig) {
    return null;
  }

  const baseKeyMatch =
    legacyConfig[agentId] ?? legacyConfig[agentId.toLowerCase()] ?? legacyConfig[agentId.toUpperCase()];
  const aliasKeys = AGENT_LEGACY_ALIASES[agentId] ?? [];
  const aliasMatch = aliasKeys.map((key) => legacyConfig[key]).find(Boolean);
  return normalizeCredentials(baseKeyMatch ?? aliasMatch ?? undefined);
}

function priorityEmoji(priority: PriorityLevel): string {
  switch (priority) {
    case "CRITICAL":
      return "🔴";
    case "P1":
      return "🟠";
    case "P2":
      return "🟡";
    case "P3":
      return "🔵";
    case "P4":
    default:
      return "⚪";
  }
}

const STATUS_EMOJI: Record<TaskStatus, string> = {
  new: "🆕",
  queued: "🟡",
  in_progress: "🔵",
  pending_review: "🟣",
  blocked: "🚧",
  parked: "⏸️",
  completed: "✅",
  cancelled: "⚪",
  aborted: "🛑",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  new: "New",
  queued: "Queued",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  blocked: "Blocked",
  parked: "Parked",
  completed: "Completed",
  cancelled: "Cancelled",
  aborted: "Aborted",
};

export function formatTaskMessage(task: TaskRecord): string {
  const priorityLabel = PRIORITY_META[task.priority]?.label ?? task.priority;
  const description = task.description ? `\n\n${task.description}` : "";
  const statusEmoji = STATUS_EMOJI[task.status] ?? "ℹ️";
  const statusLabel = STATUS_LABEL[task.status] ?? task.status;

  return `📋 <b>New Task Assigned</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${priorityEmoji(task.priority)} Priority: ${priorityLabel}\n${statusEmoji} Status: ${statusLabel}\n\n<b>🔴 ACTION REQUIRED — เริ่มทำได้เลย</b>\n\n<b>${task.title}</b>${description}\n\n━━━━━━━━━━━━━━━━━━━━━━\nTask ID: ${task.id}\nAssigned via Mission Control`;
}

export interface DispatchResult {
  success: boolean;
  messageId?: number;
  error?: string;
  statusCode?: number;
}

export async function dispatchTaskToAgent(task: TaskRecord): Promise<DispatchResult> {
  const config = await getAgentTelegramConfig(task.agent);
  if (!config) {
    return {
      success: false,
      error: `Missing Telegram config for agent: ${task.agent}`,
    };
  }

  const message = formatTaskMessage(task);
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `Telegram API responded with ${response.status}`,
        statusCode: response.status,
      };
    }

    const payload = await response.json();
    const messageId = payload?.result?.message_id ?? payload?.result?.messageId;

    return {
      success: true,
      messageId: typeof messageId === "number" ? messageId : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to dispatch task",
    };
  }
}

export function formatPendingReviewMessage(task: TaskRecord): string {
  const priorityLabel = PRIORITY_META[task.priority]?.label ?? task.priority;
  const summary = task.resultSummary ? `\nผลลัพธ์: ${task.resultSummary}` : "";
  const reference = task.attachments?.[0] ? `\n🔗 ดูที่: ${task.attachments[0]}` : "";

  return (
    `🔍 ${task.agent.toUpperCase()} — Review Required` +
    `\n━━━━━━━━━━━━━━━━━━━━━━` +
    `\n📋 Task: ${task.title}` +
    `\n🟡 Priority: ${priorityLabel}` +
    (task.modelUsed ? `\n🤖 Model: ${task.modelUsed}` : "") +
    summary +
    reference +
    `\n\nตอบ \"ok\" เพื่อ approve หรือพิมพ์ feedback กลับมา`
  );
}

export function formatBlockedTaskMessage(task: TaskRecord): string {
  const priorityLabel = PRIORITY_META[task.priority]?.label ?? task.priority;
  const description = task.description ? `\nรายละเอียด: ${task.description}` : "";

  return (
    `🚧 ${task.agent.toUpperCase()} — Blocked` +
    `\n━━━━━━━━━━━━━━━━━━━━━━` +
    `\n📋 Task: ${task.title}` +
    `\n🔺 Priority: ${priorityLabel}` +
    description +
    (task.resultSummary ? `\nสรุปล่าสุด: ${task.resultSummary}` : "") +
    `\n\nพิมพ์คำแนะนำหรือส่ง resource ให้ agent กลับไปทำต่อ`
  );
}

export function formatAutoCompleteMessage(task: TaskRecord): string {
  const duration = task.startedAt
    ? (() => {
        const start = new Date(task.startedAt).getTime();
        const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
        const minutes = Math.round((end - start) / 60000);
        if (minutes < 1) return "<1m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
      })()
    : null;

  const summary = task.resultSummary ? `\nผลลัพธ์: ${task.resultSummary}` : "";

  return (
    `✅ ${task.agent.toUpperCase()} — Task Complete` +
    `\n━━━━━━━━━━━━━━━━━━━━━━` +
    `\n📋 Task: ${task.title}` +
    (duration ? `\n⏱ Duration: ${duration}` : "") +
    summary +
    `\n━━━━━━━━━━━━━━━━━━━━━━`
  );
}
