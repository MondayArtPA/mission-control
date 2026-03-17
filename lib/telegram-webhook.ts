import type { TaskRecord } from "@/types/task";
import { detectReviewDecision, deriveTaskUpdatesFromDecision, type ReviewDecision } from "@/lib/telegram-review";

interface TelegramUser {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  from?: TelegramUser;
  reply_to_message?: {
    message_id: number;
  };
}

interface TelegramUpdate {
  message?: TelegramMessage;
}

export interface TelegramReviewResult {
  task: TaskRecord;
  decision: ReviewDecision;
  patch: Partial<TaskRecord> | null;
  reviewer?: string;
  rawMessage?: string;
}

export function resolveTaskFromTelegramReply(tasks: TaskRecord[], messageId: number): TaskRecord | null {
  return (
    tasks.find(
      (task) => task.dispatchMessageId === messageId || task.reviewMessageId === messageId
    ) ?? null
  );
}

export function handleTelegramReply(update: TelegramUpdate, tasks: TaskRecord[]): TelegramReviewResult | null {
  const message = update.message;
  if (!message?.reply_to_message) {
    return null;
  }

  const task = resolveTaskFromTelegramReply(tasks, message.reply_to_message.message_id);
  if (!task) {
    return null;
  }

  const decision = detectReviewDecision(message.text ?? "");
  const reviewer = message.from?.first_name || message.from?.username || "art";

  if (decision === "comment") {
    return { task, decision, patch: null, reviewer, rawMessage: message.text ?? "" };
  }

  const patch = deriveTaskUpdatesFromDecision(task, decision, reviewer);
  return {
    task,
    decision,
    patch,
    reviewer,
    rawMessage: message.text ?? "",
  };
}
