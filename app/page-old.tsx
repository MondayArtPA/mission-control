"use client";

import { useState, useEffect, useRef } from "react";

// ─── Color Tokens ─────────────────────────────────────────
const C = {
  bg: "#0a0a0a",
  surface: "#111113",
  card: "#161618",
  border: "#1e1e22",
  text: "#e4e4e7",
  textMuted: "#71717a",
  textDim: "#52525b",
  cyan: "#06b6d4",
  magenta: "#d946ef",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

// ─── Status Config ────────────────────────────────────────
const STATUS_LIST = [
  { id: "online", label: "Online", color: C.green, icon: "⚡" },
  { id: "focus", label: "Focus Mode", color: C.amber, icon: "🎯" },
  { id: "offline", label: "Offline", color: C.red, icon: "⏸" },
];

const QUOTES = [
  "Build systems that scale, not just tasks.",
  "Focus is not about saying yes. It's about saying no.",
  "Ship fast. Learn faster.",
  "Data beats opinions.",
  "Think in systems, act on leverage points.",
  "Done is better than perfect.",
  "The best time to start was yesterday. The next best time is now.",
  "Automate the boring stuff.",
];

// ─── Helpers ──────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const fmtShortTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const getDayProgress = () => {
  const now = new Date();
  const wakeHour = 7, sleepHour = 23;
  const totalMinutes = (sleepHour - wakeHour) * 60;
  const currentMinutes = (now.getHours() - wakeHour) * 60 + now.getMinutes();
  return Math.max(0, Math.min(100, (currentMinutes / totalMinutes) * 100));
};

// ─── Types ────────────────────────────────────────────────
type Priority = { id: number; text: string; done: boolean };
type LogEntry = { time: string; text: string; type: string };

// ═════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════

export default function MissionControlPage() {
  const [now, setNow] = useState(new Date());
  const [statusIdx, setStatusIdx] = useState(0);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [notes, setNotes] = useState("");
  const [priorities, setPriorities] = useState<Priority[]>([
    { id: 1, text: "Review Mission Control dashboard", done: false },
    { id: 2, text: "Plan Q1 strategy", done: false },
    { id: 3, text: "Deep work session: 2hrs", done: false },
  ]);
  const [newPriority, setNewPriority] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: "07:00", text: "System initialized — all services online", type: "system" },
    { time: "07:15", text: "Morning routine completed", type: "event" },
    { time: "08:00", text: "Deep Work session started", type: "focus" },
    { time: "09:30", text: "Client email — proposal sent", type: "event" },
    { time: "10:00", text: "Stand-up sync with team", type: "event" },
    { time: "10:30", text: "Coffee break - 15min", type: "event" },
    { time: "11:00", text: "AI research: agentic workflows", type: "focus" },
    { time: "12:00", text: "Lunch break", type: "event" },
    { time: "13:30", text: "Code review — dashboard PR merged", type: "focus" },
    { time: "14:00", text: "Client Call - Project X", type: "event" },
  ]);
  const [newLog, setNewLog] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Simulated notifications
  useEffect(() => {
    const events = [
      "Incoming webhook: Stripe payment $49.99",
      "GitHub: PR #142 merged to main",
      "Vercel: Deploy succeeded (2.1s)",
      "Slack: @art mentioned in #product",
      "Calendar: Client call in 30 min",
      "Analytics: 1,247 page views today",
      "Uptime: All systems operational",
      "Monday Agent: Task completed — slide deck created",
      "Cowork Bridge: Request processed",
      "Server: CPU usage normal at 23%",
    ];
    const interval = setInterval(() => {
      const event = events[Math.floor(Math.random() * events.length)];
      setLogs((prev) => [...prev, { time: fmtShortTime(new Date()), text: event, type: "notification" }]);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const status = STATUS_LIST[statusIdx];
  const dayProgress = getDayProgress();

  const togglePriority = (id: number) =>
    setPriorities((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));

  const removePriority = (id: number) =>
    setPriorities((prev) => prev.filter((p) => p.id !== id));

  const addPriority = () => {
    if (!newPriority.trim() || priorities.length >= 5) return;
    setPriorities((prev) => [...prev, { id: Date.now(), text: newPriority.trim(), done: false }]);
    setNewPriority("");
  };

  const addLog = () => {
    if (!newLog.trim()) return;
    setLogs((prev) => [...prev, { time: fmtShortTime(new Date()), text: newLog.trim(), type: "manual" }]);
    setNewLog("");
  };

  const logColor: Record<string, string> = {
    system: C.textDim,
    event: C.cyan,
    focus: C.magenta,
    notification: C.amber,
    manual: C.green,
  };

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══ HEADER: THE PULSE ═══ */}
      <header
        style={{
          background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`,
          padding: "20px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          {/* Clock */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Mission Control</span>
            </div>
            <div style={{ width: 1, height: 32, background: C.border }} />
            <div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: C.text,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                {fmtTime(now)}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                {fmtDate(now)}
              </div>
            </div>
          </div>

          {/* North Star */}
          <div style={{ flex: 1, minWidth: 200, maxWidth: 440, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
              ✦ North Star
            </div>
            <div style={{ fontSize: 14, color: C.amber, fontStyle: "italic", lineHeight: 1.5 }}>
              &ldquo;{quote}&rdquo;
            </div>
          </div>

          {/* Status Toggle */}
          <button
            onClick={() => setStatusIdx((i) => (i + 1) % STATUS_LIST.length)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: status.color + "12",
              border: `1px solid ${status.color}33`,
              borderRadius: 8,
              padding: "10px 18px",
              cursor: "pointer",
              color: status.color,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.2s",
            }}
          >
            <span>{status.icon}</span>
            {status.label}
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
          </button>
        </div>
      </header>

      {/* ═══ MAIN 3-COLUMN GRID ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr 300px",
          gap: 16,
          padding: "20px 32px",
          height: "calc(100vh - 105px)",
        }}
      >
        {/* ─── LEFT: THE BRAIN ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
          {/* Quick Capture */}
          <Card title="QUICK CAPTURE" icon="⊕" accent={C.magenta}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brain dump anything here..."
              style={{
                width: "100%",
                minHeight: 150,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.text,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                padding: "10px 12px",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.7,
              }}
            />
          </Card>

          {/* Priorities */}
          <Card title="TOP PRIORITIES" icon="◎" accent={C.cyan}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {priorities.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: p.done ? C.green + "08" : "transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <button
                    onClick={() => togglePriority(p.id)}
                    style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${p.done ? C.green : C.textDim}`,
                      background: p.done ? C.green + "22" : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.green, fontSize: 11,
                    }}
                  >
                    {p.done && "✓"}
                  </button>
                  <span style={{
                    flex: 1, fontSize: 13,
                    color: p.done ? C.textDim : C.text,
                    textDecoration: p.done ? "line-through" : "none",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {p.text}
                  </span>
                  <button
                    onClick={() => removePriority(p.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim, fontSize: 12, opacity: 0.3, padding: 2 }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.3"; }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPriority()}
                  placeholder="Add priority..."
                  style={{
                    flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
                    color: C.text, fontSize: 12, padding: "6px 10px", outline: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <button
                  onClick={addPriority}
                  style={{
                    background: C.cyan + "18", border: `1px solid ${C.cyan}33`, borderRadius: 6,
                    color: C.cyan, cursor: "pointer", padding: "4px 10px", fontSize: 14,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </Card>

          {/* Day Progress */}
          <Card title="DAY PROGRESS" icon="◔" accent={C.textMuted}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textDim, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              <span>07:00</span>
              <span style={{ color: C.cyan, fontWeight: 600 }}>{Math.round(dayProgress)}%</span>
              <span>23:00</span>
            </div>
            <div style={{ width: "100%", background: C.surface, borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${dayProgress}%`, height: "100%", borderRadius: 4,
                background: `linear-gradient(90deg, ${C.cyan}, ${C.magenta})`,
                boxShadow: `0 0 10px ${C.cyan}33`,
                transition: "width 1s ease",
              }} />
            </div>
          </Card>
        </div>

        {/* ─── CENTER: THE FEED ─── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Feed Header */}
          <div style={{
            padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.cyan, fontSize: 14 }}>❯_</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                Event Stream
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
              LIVE — {logs.length} events
            </div>
          </div>

          {/* Log Entries */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "7px 10px", borderRadius: 6,
                  background: i === logs.length - 1 ? (logColor[log.type] || C.cyan) + "06" : "transparent",
                }}
              >
                <span style={{
                  fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                  color: C.textDim, whiteSpace: "nowrap", marginTop: 1,
                }}>
                  [{log.time}]
                </span>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                  background: logColor[log.type] || C.cyan,
                  boxShadow: `0 0 6px ${logColor[log.type] || C.cyan}44`,
                }} />
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{log.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input
              value={newLog}
              onChange={(e) => setNewLog(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLog()}
              placeholder="Log an event... (Press Enter)"
              style={{
                flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, padding: "10px 14px", outline: "none",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <button
              onClick={addLog}
              style={{
                background: `linear-gradient(135deg, ${C.cyan}22, ${C.magenta}18)`,
                border: `1px solid ${C.cyan}33`, borderRadius: 8,
                color: C.cyan, cursor: "pointer", padding: "8px 16px",
                fontSize: 16, fontWeight: 600,
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* ─── RIGHT: THE STATS ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
          {/* Financials */}
          <Card title="FINANCIALS" icon="$" accent={C.green}>
            <Metric label="MRR" value="$12,450" sub="+12.3% vs last month" color={C.green} />
            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
            <Metric label="REVENUE (MTD)" value="$8,230" sub="68% of target" color={C.text} />
            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
            <Metric label="GROWTH" value="+23%" sub="YoY acceleration" color={C.magenta} />
          </Card>

          {/* Key Metrics */}
          <Card title="METRICS" icon="↗" accent={C.amber}>
            {[
              { label: "Deep Work Hrs", value: "4.5", pct: 56, color: C.magenta },
              { label: "Tasks Completed", value: "7/12", pct: 58, color: C.green },
              { label: "Focus Score", value: "85%", pct: 85, color: C.cyan },
              { label: "Inbox Zero", value: "3 left", pct: 88, color: C.amber },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</span>
                  <span style={{ color: m.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</span>
                </div>
                <div style={{ width: "100%", background: C.surface, borderRadius: 3, height: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${m.pct}%`, height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${m.color}, ${m.color}88)`,
                    transition: "width 1s ease",
                  }} />
                </div>
              </div>
            ))}
          </Card>

          {/* System Status */}
          <Card title="SYSTEM STATUS" icon="●" accent={C.textMuted}>
            {[
              { name: "API Gateway", status: "Operational", color: C.green },
              { name: "Database", status: "Operational", color: C.green },
              { name: "Monday Agent", status: status.label, color: status.color },
              { name: "Cowork Bridge", status: "Standby", color: C.amber },
              { name: "BLUEPRINT", status: "Not deployed", color: C.red },
            ].map((s) => (
              <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "4px 0" }}>
                <span style={{ color: C.textMuted }}>{s.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, boxShadow: `0 0 4px ${s.color}66` }} />
                  <span style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{s.status}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textDim}; }
        input:focus, textarea:focus { border-color: ${C.cyan}44 !important; }
      `}</style>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────

function Card({ title, icon, accent, children }: { title: string; icon: string; accent: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 18px",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = accent + "44";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${accent}11`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = C.border;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ color: accent, fontSize: 13 }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase" as const, color: C.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}
