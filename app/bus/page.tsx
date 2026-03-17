"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import type { AgentName, AgentOverview } from "@/types/task";
import type { BusFeedItem, BusMessage, KnowledgeEntry, DelegationRecord } from "@/types/bus";

type Tab = "feed" | "messages" | "knowledge" | "delegations";

const POLL_INTERVAL = 10000;

/* ─── Helpers ─── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function agentColor(agent: string): string {
  const map: Record<string, string> = {
    monday: "text-cyan-300",
    blueprint: "text-emerald-300",
    quant: "text-yellow-300",
    swiss: "text-orange-300",
    pixar: "text-fuchsia-300",
    hubble: "text-violet-300",
    marcus: "text-lime-300",
    trueone: "text-red-300",
    system: "text-gray-400",
  };
  return map[agent] || "text-gray-300";
}

function priorityDot(priority: string): string {
  if (priority === "urgent") return "bg-red-400";
  if (priority === "high") return "bg-orange-400";
  if (priority === "normal") return "bg-cyan-400";
  return "bg-gray-500";
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-300 ring-yellow-500/30",
    accepted: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30",
    in_progress: "bg-blue-500/10 text-blue-300 ring-blue-500/30",
    completed: "bg-green-500/10 text-green-300 ring-green-500/30",
    rejected: "bg-red-500/10 text-red-300 ring-red-500/30",
    read: "bg-gray-500/10 text-gray-400 ring-gray-500/30",
  };
  const cls = styles[status] || styles.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ring-1 ${cls}`}>
      {status}
    </span>
  );
}

/* ─── Send Message Modal ─── */

function SendMessageForm({
  agents,
  onSent,
  onClose,
}: {
  agents: AgentOverview[];
  onSent: () => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState<string>("monday");
  const [to, setTo] = useState<string>("blueprint");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [sending, setSending] = useState(false);

  const agentIds = agents.filter((a) => a.id !== "system").map((a) => a.id);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await fetch("/api/bus/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, body, priority }),
      });
      onSent();
      onClose();
    } catch {
      console.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-[#0d1118] p-6 shadow-2xl">
        <div className="mb-4 text-xs uppercase tracking-[0.3em] text-accent-cyan">Send Bus Message</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] text-gray-400">From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white">
              {agentIds.map((id) => (
                <option key={id} value={id}>{id.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-400">To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white">
              {agentIds.map((id) => (
                <option key={id} value={id}>{id.toUpperCase()}</option>
              ))}
              <option value="all">ALL</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-400">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white" placeholder="หัวข้อสั้นๆ" />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-400">Body</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white" placeholder="รายละเอียด..." />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-400">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-border/70 px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="button" onClick={handleSend} disabled={sending || !subject.trim()} className="rounded-xl bg-accent-cyan/20 px-4 py-2 text-sm font-medium text-accent-cyan ring-1 ring-accent-cyan/30 hover:bg-accent-cyan/30 disabled:opacity-40">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Create Delegation Modal ─── */

function CreateDelegationForm({
  agents,
  onCreated,
  onClose,
}: {
  agents: AgentOverview[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState("monday");
  const [to, setTo] = useState("blueprint");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState("normal");
  const [creating, setCreating] = useState(false);

  const agentIds = agents.filter((a) => a.id !== "system").map((a) => a.id);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/bus/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, title, detail, priority }),
      });
      onCreated();
      onClose();
    } catch {
      console.error("Failed to create delegation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-[#0d1118] p-6 shadow-2xl">
        <div className="mb-4 text-xs uppercase tracking-[0.3em] text-accent-magenta">Create Delegation</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] text-gray-400">From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white">
              {agentIds.map((id) => (
                <option key={id} value={id}>{id.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-400">Delegate To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white">
              {agentIds.map((id) => (
                <option key={id} value={id}>{id.toUpperCase()}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-400">Task Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white" placeholder="ชื่องานที่ต้องทำ" />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-400">Detail</span>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white" placeholder="รายละเอียดงาน..." />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-400">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full rounded-xl border border-border/70 bg-[#0f141b] px-3 py-2 text-sm text-white">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-border/70 px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="button" onClick={handleCreate} disabled={creating || !title.trim()} className="rounded-xl bg-accent-magenta/20 px-4 py-2 text-sm font-medium text-accent-magenta ring-1 ring-accent-magenta/30 hover:bg-accent-magenta/30 disabled:opacity-40">
            {creating ? "Creating..." : "Delegate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function SharedBusPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [feed, setFeed] = useState<BusFeedItem[]>([]);
  const [messages, setMessages] = useState<BusMessage[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [delegations, setDelegations] = useState<DelegationRecord[]>([]);
  const [agents, setAgents] = useState<AgentOverview[]>([]);
  const [inboxAgent, setInboxAgent] = useState<string>("all");
  const [showSendForm, setShowSendForm] = useState(false);
  const [showDelegateForm, setShowDelegateForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [agentRes, feedRes] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()),
        fetch("/api/bus/feed?limit=50").then((r) => r.json()),
      ]);
      if (agentRes.success) setAgents(agentRes.data);
      if (feedRes.success) setFeed(feedRes.data);

      if (tab === "messages") {
        const url = inboxAgent === "all" ? "/api/bus/feed?limit=100" : `/api/bus/inbox?agent=${inboxAgent}`;
        const res = await fetch(url).then((r) => r.json());
        if (res.success) setMessages(res.data);
      } else if (tab === "knowledge") {
        const res = await fetch("/api/bus/knowledge").then((r) => r.json());
        if (res.success) setKnowledge(res.data);
      } else if (tab === "delegations") {
        const res = await fetch("/api/bus/delegate").then((r) => r.json());
        if (res.success) setDelegations(res.data);
      }
    } catch (err) {
      console.error("Bus load error", err);
    }
  }, [tab, inboxAgent]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadData]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const pendingDelegations = delegations.filter((d) => d.status === "pending" || d.status === "accepted" || d.status === "in_progress").length;
    const completedDelegations = delegations.filter((d) => d.status === "completed").length;
    return { feedCount: feed.length, knowledgeCount: knowledge.length, pendingDelegations, completedDelegations };
  }, [feed, knowledge, delegations]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "feed", label: "Activity Feed", count: stats.feedCount },
    { id: "messages", label: "Messages" },
    { id: "knowledge", label: "Knowledge Base", count: stats.knowledgeCount },
    { id: "delegations", label: "Delegations", count: stats.pendingDelegations },
  ];

  const agentIds = agents.filter((a) => a.id !== "system").map((a) => a.id);

  return (
    <AppShell eyebrow="Agent Mesh" title="Shared Bus" description="Inter-agent messaging, knowledge sharing & task delegation">
      <div className="space-y-6">
        {/* ─── Summary Cards ─── */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-[#0f1723] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Bus Activity</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-accent-cyan">{stats.feedCount}</span>
              <span className="text-sm text-gray-500">events</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-[#120f18] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Knowledge Entries</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-accent-purple">{stats.knowledgeCount}</span>
              <span className="text-sm text-gray-500">shared</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-[#0f1720] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Active Delegations</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-accent-amber">{stats.pendingDelegations}</span>
              <span className="text-sm text-gray-500">in-flight</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-[#101a17] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Completed</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-accent-green">{stats.completedDelegations}</span>
              <span className="text-sm text-gray-500">delegations</span>
            </div>
          </div>
        </div>

        {/* ─── Tab Navigation ─── */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-accent-cyan/10 text-accent-cyan ring-1 ring-accent-cyan/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">{t.count}</span>
              )}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setShowSendForm(true)}
              className="rounded-xl bg-accent-cyan/10 px-3 py-1.5 text-xs font-medium text-accent-cyan ring-1 ring-accent-cyan/30 hover:bg-accent-cyan/20"
            >
              + Message
            </button>
            <button
              type="button"
              onClick={() => setShowDelegateForm(true)}
              className="rounded-xl bg-accent-magenta/10 px-3 py-1.5 text-xs font-medium text-accent-magenta ring-1 ring-accent-magenta/30 hover:bg-accent-magenta/20"
            >
              + Delegate
            </button>
          </div>
        </div>

        {/* ─── Tab Content ─── */}
        <div className="rounded-3xl border border-border/60 bg-[#0b111a] p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
          {/* FEED TAB */}
          {tab === "feed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-[0.3em] text-accent-cyan">Live Bus Activity</div>
                <span className="flex items-center gap-2 text-xs text-green-300">● Live</span>
              </div>
              {feed.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">📡</div>
                  <p>No bus activity yet. Agents will show up here when they communicate.</p>
                </div>
              )}
              {feed.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/60 bg-[#0f141b] p-3">
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500">
                    <span suppressHydrationWarning>{timeAgo(item.timestamp)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${agentColor(item.from)}`}>{item.from.toUpperCase()}</span>
                      <span className="text-gray-600">→</span>
                      <span className={`font-semibold ${agentColor(typeof item.to === "string" ? item.to : "all")}`}>
                        {typeof item.to === "string" ? item.to.toUpperCase() : "ALL"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-white">{item.subject}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-gray-400">{item.type}</span>
                    {statusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MESSAGES TAB */}
          {tab === "messages" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-[0.3em] text-accent-cyan">Inbox</div>
                <select
                  value={inboxAgent}
                  onChange={(e) => setInboxAgent(e.target.value)}
                  className="rounded-xl border border-border/70 bg-[#0f141b] px-3 py-1.5 text-xs text-white"
                >
                  <option value="all">All Agents</option>
                  {agentIds.map((id) => (
                    <option key={id} value={id}>{id.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              {messages.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">💬</div>
                  <p>No messages. Use &quot;+ Message&quot; to send one.</p>
                </div>
              )}
              {messages.map((msg: any) => (
                <div key={msg.id} className="rounded-2xl border border-border/60 bg-[#0f141b] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${agentColor(msg.from)}`}>{msg.from?.toUpperCase()}</span>
                      <span className="text-gray-600 text-xs">→</span>
                      <span className={`text-sm font-bold ${agentColor(msg.to || "all")}`}>{(msg.to || "all").toUpperCase()}</span>
                    </div>
                    <span className="text-[11px] text-gray-500" suppressHydrationWarning>{timeAgo(msg.timestamp || msg.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {msg.priority && <span className={`h-2 w-2 rounded-full ${priorityDot(msg.priority)}`} />}
                    <span className="text-sm font-medium text-white">{msg.subject}</span>
                  </div>
                  {msg.body && <p className="mt-1 text-sm text-gray-300 line-clamp-3">{msg.body}</p>}
                  <div className="mt-2">{statusBadge(msg.status)}</div>
                </div>
              ))}
            </div>
          )}

          {/* KNOWLEDGE TAB */}
          {tab === "knowledge" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-[0.3em] text-accent-purple">Knowledge Base</div>
                <span className="text-xs text-gray-500">{knowledge.length} entries</span>
              </div>
              {knowledge.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">🧠</div>
                  <p>No knowledge shared yet. Agents share findings here after completing tasks.</p>
                </div>
              )}
              {knowledge.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border/60 bg-[#0f141b] p-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${agentColor(entry.author)}`}>{entry.author.toUpperCase()}</span>
                    <span className="text-[11px] text-gray-500" suppressHydrationWarning>{timeAgo(entry.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-white">{entry.topic}</h3>
                  <p className="mt-1 text-sm text-gray-300 line-clamp-4 whitespace-pre-wrap">{entry.content}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-accent-purple/10 px-2 py-0.5 text-[10px] font-mono text-accent-purple/70">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-gray-600">Accessed {entry.accessCount}x</div>
                </div>
              ))}
            </div>
          )}

          {/* DELEGATIONS TAB */}
          {tab === "delegations" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-[0.3em] text-accent-magenta">Delegations</div>
                <span className="text-xs text-gray-500">{delegations.length} total</span>
              </div>
              {delegations.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-2">🤝</div>
                  <p>No delegations yet. Use &quot;+ Delegate&quot; to assign a task between agents.</p>
                </div>
              )}
              {delegations.map((del) => (
                <div key={del.id} className="rounded-2xl border border-border/60 bg-[#0f141b] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${agentColor(del.from)}`}>{del.from.toUpperCase()}</span>
                      <span className="text-gray-600 text-xs">delegated to</span>
                      <span className={`text-sm font-bold ${agentColor(del.to)}`}>{del.to.toUpperCase()}</span>
                    </div>
                    <span className="text-[11px] text-gray-500" suppressHydrationWarning>{timeAgo(del.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${priorityDot(del.priority)}`} />
                    <span className="text-sm font-medium text-white">{del.title}</span>
                  </div>
                  {del.detail && <p className="mt-1 text-sm text-gray-300 line-clamp-2">{del.detail}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    {statusBadge(del.status)}
                    {del.result && (
                      <span className="text-[11px] text-gray-400 truncate max-w-[200px]">Result: {del.result}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      {showSendForm && <SendMessageForm agents={agents} onSent={loadData} onClose={() => setShowSendForm(false)} />}
      {showDelegateForm && <CreateDelegationForm agents={agents} onCreated={loadData} onClose={() => setShowDelegateForm(false)} />}
    </AppShell>
  );
}
