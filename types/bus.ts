import type { AgentName } from "./task";

/* ─── Message ─── */

export type BusMessageType = "message" | "request" | "response" | "knowledge" | "delegation";
export type BusPriority = "low" | "normal" | "high" | "urgent";
export type MessageStatus = "pending" | "read" | "replied" | "expired";

export interface BusMessage {
  id: string;
  from: AgentName;
  to: AgentName | "all";
  type: BusMessageType;
  subject: string;
  body: string;
  priority: BusPriority;
  replyTo?: string;
  taskId?: string;
  createdAt: string;
  readAt?: string | null;
  status: MessageStatus;
}

/* ─── Knowledge ─── */

export interface KnowledgeEntry {
  id: string;
  author: AgentName;
  topic: string;
  tags: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
}

/* ─── Delegation ─── */

export type DelegationStatus = "pending" | "accepted" | "in_progress" | "completed" | "rejected";

export interface DelegationRecord {
  id: string;
  parentTaskId?: string;
  from: AgentName;
  to: AgentName;
  title: string;
  detail: string;
  priority: BusPriority;
  status: DelegationStatus;
  result?: string;
  createdAt: string;
  completedAt?: string | null;
}

/* ─── Feed ─── */

export interface BusFeedItem {
  id: string;
  type: BusMessageType;
  from: AgentName;
  to: AgentName | "all";
  subject: string;
  timestamp: string;
  status: string;
}
