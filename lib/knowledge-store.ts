import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "@/lib/markdown-parser";
import type {
  KnowledgeFile,
  KnowledgeMetadata,
  KnowledgePrefix,
  KnowledgeSearchFilters,
  KnowledgeSearchResult,
  KnowledgeStatus,
  KnowledgeSummary,
} from "@/types/knowledge";

const KNOWLEDGE_ROOT = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "memory");
const ARCHIVE_ROOT = path.join(KNOWLEDGE_ROOT, "archive");

const resolveKnowledgePath = (filename: string) => {
  const normalized = path.basename(filename);
  if (normalized !== filename || filename.includes("..") || filename.includes("/")) {
    throw new Error("invalid filename");
  }
  return path.join(KNOWLEDGE_ROOT, normalized);
};

export interface CreateKnowledgePayload {
  prefix: Exclude<KnowledgePrefix, "misc">;
  slug: string;
  title?: string;
  content?: string;
}

export interface UpdateKnowledgePayload {
  content?: string;
  metadata?: Partial<KnowledgeMetadata>;
  verifyAfterDays?: number;
}

const TODAY = () => new Date();

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const toISODate = (date: Date) => date.toISOString().split("T")[0];

const addDays = (days: number) => {
  const date = TODAY();
  date.setDate(date.getDate() + days);
  return date;
};

function inferPrefix(filename: string): KnowledgePrefix {
  if (filename.startsWith("sys-")) return "sys";
  if (filename.startsWith("dec-")) return "dec";
  if (filename.startsWith("run-")) return "run";
  return "misc";
}

function sanitizeSlug(slug: string) {
  return slug
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function buildTemplate(prefix: CreateKnowledgePayload["prefix"], title: string) {
  switch (prefix) {
    case "sys":
      return `# System: ${title}\n\n## Overview\n\n## Key Files\n- \n\n## Notes\n`;
    case "dec":
      return `# Decision: ${title}\n\n## Date: ${toISODate(TODAY())}\n\n## Context\n\n## Decision\n\n## Rationale\n`;
    case "run":
      return `# Runbook: ${title}\n\n## Purpose\n\n## Steps\n1. \n2. \n3. \n\n## Validation\n`;
    default:
      return `# ${title}\n`;
  }
}

function computeStatus(prefix: KnowledgePrefix, metadata: KnowledgeMetadata): KnowledgeStatus {
  if (prefix === "dec" && metadata.approved !== true) {
    return "needs_approval";
  }
  const verifyDateStr = (metadata.verify_after as string) ?? metadata.verifyAfter;
  if (!verifyDateStr) return "unknown";
  const verifyDate = new Date(verifyDateStr);
  if (Number.isNaN(verifyDate.getTime())) return "unknown";
  const diffDays = (verifyDate.getTime() - TODAY().getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "verify_soon";
  return "current";
}

async function readKnowledgeFile(filename: string) {
  const fullPath = resolveKnowledgePath(filename);
  const data = await fs.readFile(fullPath, "utf8");
  const stats = await fs.stat(fullPath);
  const { metadata, body } = parseFrontmatter(data);
  const prefix = inferPrefix(filename);
  const status = computeStatus(prefix, metadata as KnowledgeMetadata);
  return {
    filename,
    path: fullPath,
    prefix,
    lines: data.split(/\r?\n/).length,
    size: stats.size,
    metadata: metadata as KnowledgeMetadata,
    status,
    content: data,
    body,
  };
}

function buildSummary(record: Awaited<ReturnType<typeof readKnowledgeFile>>): KnowledgeSummary {
  const { body: _body, ...rest } = record;
  return {
    filename: rest.filename,
    path: rest.path,
    prefix: rest.prefix,
    lines: rest.lines,
    size: rest.size,
    metadata: rest.metadata,
    status: rest.status,
  };
}

export async function listKnowledgeFiles(): Promise<KnowledgeSummary[]> {
  await ensureDir(KNOWLEDGE_ROOT);
  const entries = await fs.readdir(KNOWLEDGE_ROOT, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
  const data = await Promise.all(files.map((file) => readKnowledgeFile(file.name)));
  return data
    .map((record) => buildSummary(record))
    .sort((a, b) => (b.metadata.last_updated ?? "").localeCompare(a.metadata.last_updated ?? ""));
}

export async function getKnowledgeFile(filename: string): Promise<KnowledgeFile> {
  const record = await readKnowledgeFile(filename);
  return {
    filename: record.filename,
    path: record.path,
    prefix: record.prefix,
    lines: record.lines,
    size: record.size,
    metadata: record.metadata,
    status: record.status,
    content: record.content,
  };
}

export async function createKnowledgeFile(payload: CreateKnowledgePayload): Promise<KnowledgeSummary> {
  const slug = sanitizeSlug(payload.slug);
  if (!slug) {
    throw new Error("ต้องใส่ชื่อไฟล์");
  }
  const filename = `${payload.prefix}-${slug}.md`;
  const fullPath = resolveKnowledgePath(filename);
  try {
    await fs.access(fullPath);
    throw new Error("ไฟล์นี้มีอยู่แล้ว");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const title = payload.title || slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const metadata: KnowledgeMetadata = {
    last_updated: toISODate(TODAY()),
    updated_by: "Art (via Mission Control)",
    verify_after: toISODate(addDays(30)),
  };
  if (payload.prefix === "dec") {
    metadata.approved = false;
  }
  const body = payload.content ?? buildTemplate(payload.prefix, title);
  const document = serializeFrontmatter(metadata, body);
  await ensureDir(KNOWLEDGE_ROOT);
  await fs.writeFile(fullPath, document, "utf8");
  return buildSummary(await readKnowledgeFile(filename));
}

export async function updateKnowledgeFile(filename: string, payload: UpdateKnowledgePayload): Promise<KnowledgeSummary> {
  const fullPath = resolveKnowledgePath(filename);
  await fs.access(fullPath);
  const data = await fs.readFile(fullPath, "utf8");
  const { metadata, body } = parseFrontmatter(data);
  let nextMetadata: KnowledgeMetadata = { ...(metadata as KnowledgeMetadata) };
  let nextBody = body;

  if (payload.content !== undefined) {
    const parsed = parseFrontmatter(payload.content);
    nextMetadata = { ...(parsed.metadata as KnowledgeMetadata) };
    nextBody = parsed.body;
  }

  if (payload.metadata) {
    nextMetadata = { ...nextMetadata, ...payload.metadata };
  }

  if (typeof payload.verifyAfterDays === "number" && !Number.isNaN(payload.verifyAfterDays)) {
    nextMetadata.verify_after = toISODate(addDays(payload.verifyAfterDays));
  }

  nextMetadata.last_updated = toISODate(TODAY());
  nextMetadata.updated_by = "Art (via Mission Control)";

  const document = serializeFrontmatter(nextMetadata, nextBody);
  await fs.writeFile(fullPath, document, "utf8");
  return buildSummary(await readKnowledgeFile(filename));
}

export async function softDeleteKnowledgeFile(filename: string) {
  await ensureDir(ARCHIVE_ROOT);
  const source = resolveKnowledgePath(filename);
  const dest = path.join(ARCHIVE_ROOT, `${Date.now()}-${path.basename(filename)}`);
  await fs.rename(source, dest);
}

export async function searchKnowledgeFiles(query: string, filters: KnowledgeSearchFilters = {}): Promise<KnowledgeSearchResult[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  await ensureDir(KNOWLEDGE_ROOT);
  const entries = await fs.readdir(KNOWLEDGE_ROOT, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
  const results: KnowledgeSearchResult[] = [];

  for (const file of files) {
    const record = await readKnowledgeFile(file.name);
    const entryPrefix = record.prefix;
    if (filters.prefix && filters.prefix !== entryPrefix) continue;
    if (filters.updatedBy && (record.metadata.updated_by ?? "").toLowerCase() !== filters.updatedBy.toLowerCase()) continue;

    const contentLower = record.content.toLowerCase();
    const matchIndex = contentLower.indexOf(term);
    if (matchIndex === -1) continue;
    const start = Math.max(0, matchIndex - 80);
    const end = Math.min(record.content.length, matchIndex + term.length + 80);
    const snippet = record.content.slice(start, end).replace(/\s+/g, " ");
    results.push({ ...buildSummary(record), snippet: snippet.trim() });
  }

  return results;
}
