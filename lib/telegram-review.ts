import type { TaskRecord } from "@/types/task";

export type ReviewDecision = "approve" | "reject" | "comment";

const APPROVE_KEYWORDS = [
  "ok",
  "ok.",
  "โอเค",
  "ได้",
  "ดี",
  "ดีเลย",
  "เรียบร้อย",
  "approved",
  "approve",
  "lgtm",
  "ผ่าน",
  "ใช่",
  "confirm",
  "confirmed"
];

const REJECT_KEYWORDS = [
  "ไม่",
  "ไม่ได้",
  "แก้",
  "fix",
  "redo",
  "ทำใหม่",
  "ปรับ",
  "❌",
  "👎"
];

const APPROVE_EMOJI = new Set(["👍", "✅"]);
const REJECT_EMOJI = new Set(["👎", "❌"]);

function normalizeMessage(input: string): string {
  return input.replace(/[\p{P}\p{S}]/gu, " ").trim().toLowerCase();
}

export function detectReviewDecision(message: string): ReviewDecision {
  if (!message || !message.trim()) {
    return "comment";
  }

  const trimmed = message.trim();
  const normalized = normalizeMessage(trimmed);

  if ([...APPROVE_EMOJI].some((emoji) => trimmed.includes(emoji))) {
    return "approve";
  }

  if ([...REJECT_EMOJI].some((emoji) => trimmed.includes(emoji))) {
    return "reject";
  }

  if (REJECT_KEYWORDS.some((keyword) => normalized === keyword || normalized.startsWith(`${keyword} `))) {
    return "reject";
  }

  if (APPROVE_KEYWORDS.some((keyword) => normalized === keyword || normalized.startsWith(`${keyword} `))) {
    return "approve";
  }

  return "comment";
}

export function deriveTaskUpdatesFromDecision(
  task: TaskRecord,
  decision: ReviewDecision,
  reviewer = "art",
  timestamp = new Date().toISOString()
): Partial<TaskRecord> | null {
  if (decision === "approve") {
    return {
      status: "completed",
      reviewedBy: reviewer,
      reviewedAt: timestamp,
      autoComplete: false,
    } satisfies Partial<TaskRecord>;
  }

  if (decision === "reject") {
    return {
      status: "in_progress",
      reviewedBy: reviewer,
      reviewedAt: timestamp,
    } satisfies Partial<TaskRecord>;
  }

  return null;
}

export function buildTelegramReplyContext(task: TaskRecord) {
  return {
    taskId: task.id,
    agent: task.agent,
    priority: task.priority,
    status: task.status,
    title: task.title,
  };
}
