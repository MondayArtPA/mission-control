export type KnowledgePrefix = "sys" | "dec" | "run" | "misc";

export type KnowledgeStatus = "current" | "verify_soon" | "expired" | "needs_approval" | "unknown";

export interface KnowledgeMetadata {
  last_updated?: string;
  updated_by?: string;
  verify_after?: string;
  approved?: boolean;
  [key: string]: unknown;
}

export interface KnowledgeSummary {
  filename: string;
  path: string;
  prefix: KnowledgePrefix;
  lines: number;
  size: number;
  metadata: KnowledgeMetadata;
  status: KnowledgeStatus;
  snippet?: string;
}

export interface KnowledgeFile extends KnowledgeSummary {
  content: string;
}

export interface KnowledgeSearchFilters {
  prefix?: KnowledgePrefix;
  updatedBy?: string;
}

export interface KnowledgeSearchResult extends KnowledgeSummary {
  snippet: string;
}
