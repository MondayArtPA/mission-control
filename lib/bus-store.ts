/**
 * Shared Bus — File-based store for inter-agent communication
 *
 * Data lives in ~/.openclaw/workspace/bus/ so agents can also
 * read/write directly via exec tools (file-based access).
 * Mission Control API wraps this for dashboard + routing.
 */
import fs from "fs/promises";
import path from "path";
import type { AgentName } from "@/types/task";
import type {
  BusMessage,
  KnowledgeEntry,
  DelegationRecord,
  BusFeedItem,
  BusPriority,
  BusMessageType,
} from "@/types/bus";

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/Users/Openclaw", ".openclaw");
const BUS_DIR = path.join(OPENCLAW_HOME, "workspace", "bus");
const MESSAGES_DIR = path.join(BUS_DIR, "messages");
const KNOWLEDGE_DIR = path.join(BUS_DIR, "knowledge");
const DELEGATIONS_DIR = path.join(BUS_DIR, "delegations");

/* ─── Init ─── */

async function ensureDirs(): Promise<void> {
  await fs.mkdir(MESSAGES_DIR, { recursive: true });
  await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
  await fs.mkdir(DELEGATIONS_DIR, { recursive: true });
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ─── Messages ─── */

export async function sendMessage(params: {
  from: AgentName;
  to: AgentName | "all";
  type?: BusMessageType;
  subject: string;
  body: string;
  priority?: BusPriority;
  replyTo?: string;
  taskId?: string;
}): Promise<BusMessage> {
  await ensureDirs();

  const msg: BusMessage = {
    id: generateId("msg"),
    from: params.from,
    to: params.to,
    type: params.type || "message",
    subject: params.subject,
    body: params.body,
    priority: params.priority || "normal",
    replyTo: params.replyTo,
    taskId: params.taskId,
    createdAt: new Date().toISOString(),
    readAt: null,
    status: "pending",
  };

  // Write individual message file
  const filePath = path.join(MESSAGES_DIR, `${msg.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(msg, null, 2));

  // Append to recipient's inbox
  if (params.to !== "all") {
    await appendToInbox(params.to, msg);
  } else {
    // Broadcast: append to all agents' inboxes except sender
    const agents: AgentName[] = ["monday", "blueprint", "quant", "swiss", "pixar", "hubble", "marcus", "trueone"];
    for (const agent of agents) {
      if (agent !== params.from) {
        await appendToInbox(agent, msg);
      }
    }
  }

  return msg;
}

async function appendToInbox(agent: AgentName, msg: BusMessage): Promise<void> {
  const inboxPath = path.join(MESSAGES_DIR, `inbox-${agent}.json`);
  let inbox: BusMessage[] = [];
  try {
    const raw = await fs.readFile(inboxPath, "utf-8");
    inbox = JSON.parse(raw);
  } catch {
    // New inbox
  }
  inbox.unshift(msg); // newest first
  // Keep last 50 messages
  if (inbox.length > 50) inbox = inbox.slice(0, 50);
  await fs.writeFile(inboxPath, JSON.stringify(inbox, null, 2));
}

export async function getInbox(agent: AgentName): Promise<BusMessage[]> {
  await ensureDirs();
  const inboxPath = path.join(MESSAGES_DIR, `inbox-${agent}.json`);
  try {
    const raw = await fs.readFile(inboxPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function markRead(messageId: string, agent: AgentName): Promise<void> {
  // Update inbox
  const inboxPath = path.join(MESSAGES_DIR, `inbox-${agent}.json`);
  try {
    const raw = await fs.readFile(inboxPath, "utf-8");
    const inbox: BusMessage[] = JSON.parse(raw);
    const msg = inbox.find((m) => m.id === messageId);
    if (msg) {
      msg.readAt = new Date().toISOString();
      msg.status = "read";
      await fs.writeFile(inboxPath, JSON.stringify(inbox, null, 2));
    }
  } catch {
    // ignore
  }

  // Update individual file
  const filePath = path.join(MESSAGES_DIR, `${messageId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const msg: BusMessage = JSON.parse(raw);
    msg.readAt = new Date().toISOString();
    msg.status = "read";
    await fs.writeFile(filePath, JSON.stringify(msg, null, 2));
  } catch {
    // ignore
  }
}

/* ─── Knowledge ─── */

export async function shareKnowledge(params: {
  author: AgentName;
  topic: string;
  tags: string[];
  content: string;
}): Promise<KnowledgeEntry> {
  await ensureDirs();

  const entry: KnowledgeEntry = {
    id: generateId("kb"),
    author: params.author,
    topic: params.topic,
    tags: params.tags,
    content: params.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 0,
  };

  // Write as both JSON (for API) and MD (for agents to read directly)
  const jsonPath = path.join(KNOWLEDGE_DIR, `${entry.id}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(entry, null, 2));

  const mdPath = path.join(KNOWLEDGE_DIR, `${entry.topic.replace(/[^a-zA-Z0-9ก-๙-]/g, "-")}.md`);
  const mdContent = `---\nauthor: ${entry.author}\ntopic: ${entry.topic}\ntags: ${entry.tags.join(", ")}\ncreated: ${entry.createdAt}\n---\n\n# ${entry.topic}\n\n${entry.content}\n`;
  await fs.writeFile(mdPath, mdContent);

  // Update index
  await updateKnowledgeIndex(entry);

  return entry;
}

async function updateKnowledgeIndex(entry: KnowledgeEntry): Promise<void> {
  const indexPath = path.join(KNOWLEDGE_DIR, "index.json");
  let index: Array<{ id: string; topic: string; author: string; tags: string[]; createdAt: string }> = [];
  try {
    const raw = await fs.readFile(indexPath, "utf-8");
    index = JSON.parse(raw);
  } catch {
    // New index
  }

  // Remove old entry for same topic if exists
  index = index.filter((e) => e.topic !== entry.topic);
  index.unshift({
    id: entry.id,
    topic: entry.topic,
    author: entry.author,
    tags: entry.tags,
    createdAt: entry.createdAt,
  });

  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

export async function searchKnowledge(query?: string, tags?: string[]): Promise<KnowledgeEntry[]> {
  await ensureDirs();

  const files = await fs.readdir(KNOWLEDGE_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json") && f !== "index.json");

  const entries: KnowledgeEntry[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(KNOWLEDGE_DIR, file), "utf-8");
      const entry: KnowledgeEntry = JSON.parse(raw);
      entries.push(entry);
    } catch {
      // skip corrupt files
    }
  }

  let results = entries;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (e) => e.topic.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (tags && tags.length > 0) {
    results = results.filter((e) => tags.some((t) => e.tags.includes(t)));
  }

  // Sort by newest first
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return results;
}

/* ─── Delegations ─── */

export async function createDelegation(params: {
  from: AgentName;
  to: AgentName;
  title: string;
  detail: string;
  priority?: BusPriority;
  parentTaskId?: string;
}): Promise<DelegationRecord> {
  await ensureDirs();

  const record: DelegationRecord = {
    id: generateId("del"),
    parentTaskId: params.parentTaskId,
    from: params.from,
    to: params.to,
    title: params.title,
    detail: params.detail,
    priority: params.priority || "normal",
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const filePath = path.join(DELEGATIONS_DIR, `${record.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2));

  // Also send a bus message to notify the agent
  await sendMessage({
    from: params.from,
    to: params.to,
    type: "delegation",
    subject: `Task delegated: ${params.title}`,
    body: params.detail,
    priority: params.priority || "normal",
  });

  return record;
}

export async function getDelegations(agent?: AgentName, status?: string): Promise<DelegationRecord[]> {
  await ensureDirs();

  const files = await fs.readdir(DELEGATIONS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const records: DelegationRecord[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(DELEGATIONS_DIR, file), "utf-8");
      records.push(JSON.parse(raw));
    } catch {
      // skip
    }
  }

  let results = records;
  if (agent) {
    results = results.filter((r) => r.to === agent || r.from === agent);
  }
  if (status) {
    results = results.filter((r) => r.status === status);
  }

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

export async function updateDelegation(
  id: string,
  update: Partial<Pick<DelegationRecord, "status" | "result" | "completedAt">>
): Promise<DelegationRecord | null> {
  const filePath = path.join(DELEGATIONS_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const record: DelegationRecord = JSON.parse(raw);
    Object.assign(record, update);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    return record;
  } catch {
    return null;
  }
}

/* ─── Feed ─── */

export async function getBusFeed(limit = 30): Promise<BusFeedItem[]> {
  await ensureDirs();

  const items: BusFeedItem[] = [];

  // Read all messages
  const msgFiles = (await fs.readdir(MESSAGES_DIR)).filter((f) => f.startsWith("msg-") && f.endsWith(".json"));
  for (const file of msgFiles.slice(-limit)) {
    try {
      const raw = await fs.readFile(path.join(MESSAGES_DIR, file), "utf-8");
      const msg: BusMessage = JSON.parse(raw);
      items.push({
        id: msg.id,
        type: msg.type,
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        timestamp: msg.createdAt,
        status: msg.status,
      });
    } catch {
      // skip
    }
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}
