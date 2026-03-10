import fs from "fs";
import path from "path";

import AppShell from "@/components/AppShell";
import DiskUsageChart from "@/components/DiskUsageChart";
import KnowledgeFilesTable, { KnowledgeFileEntry } from "@/components/KnowledgeFilesTable";
import SystemStatusCard from "@/components/SystemStatusCard";

interface SystemHealthData {
  timestamp?: string;
  system?: {
    disk?: { free_gb?: number; total_gb?: number; used_pct?: number };
    ram?: { used_pct?: number };
    ollama?: { status?: string; models_loaded?: number };
    gateway?: { status?: string };
  };
  disk_usage?: Record<string, number> & {
    total_mb?: number;
    monday_mb?: number;
    blueprint_mb?: number;
    quant_mb?: number;
    swiss_mb?: number;
    pixar_mb?: number;
    mission_control_mb?: number;
    mission_control_node_modules_mb?: number;
    logs_mb?: number;
  };
  knowledge_files?: {
    files?: KnowledgeFileEntry[];
    expired?: (KnowledgeFileEntry | string)[];
    missing_header?: string[];
  };
}

const dataPath = path.join(process.cwd(), "data", "system-health.json");

const readHealthData = (): SystemHealthData | null => {
  try {
    const content = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(content) as SystemHealthData;
  } catch (error) {
    return null;
  }
};

const formatTimestamp = (isoString?: string) => {
  if (!isoString) return { label: "—", date: null as Date | null };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { label: "—", date: null as Date | null };
  }
  const label = date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  return { label, date };
};

const getThresholdVariant = (value?: number) => {
  if (typeof value !== "number") return "unknown" as const;
  if (value < 70) return "ok" as const;
  if (value < 85) return "warning" as const;
  return "critical" as const;
};

const formatPercent = (value?: number) =>
  typeof value === "number" ? `${value.toFixed(0)}%` : "—";

const formatDiskCopy = (free?: number, total?: number, used?: number) => {
  if (typeof free !== "number" || typeof total !== "number") {
    return { primary: "—", secondary: "—" };
  }
  return {
    primary: `${free.toLocaleString()} GB free`,
    secondary: `${total.toLocaleString()} GB total · ${formatPercent(used)} used`,
  };
};

const formatRamCopy = (used?: number) => ({
  primary: formatPercent(used),
  secondary: "Usage",
});

const buildDiskItems = (diskUsage?: SystemHealthData["disk_usage"]) => {
  if (!diskUsage) return [] as { label: string; valueMb: number; percent: number }[];
  const mappings: { label: string; key: keyof NonNullable<SystemHealthData["disk_usage"]> }[] = [
    { label: "Monday workspace", key: "monday_mb" },
    { label: "Blueprint workspace", key: "blueprint_mb" },
    { label: "Quant workspace", key: "quant_mb" },
    { label: "Swiss workspace", key: "swiss_mb" },
    { label: "Pixar workspace", key: "pixar_mb" },
    { label: "Mission Control (code)", key: "mission_control_mb" },
    { label: "Mission Control (node_modules)", key: "mission_control_node_modules_mb" },
    { label: "Session Logs", key: "logs_mb" },
  ];

  const total = typeof diskUsage.total_mb === "number" && diskUsage.total_mb > 0
    ? diskUsage.total_mb
    : mappings.reduce((sum, item) => {
        const value = diskUsage[item.key];
        return typeof value === "number" ? sum + value : sum;
      }, 0);

  return mappings
    .map(({ label, key }) => {
      const value = diskUsage[key];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      const percent = total > 0 ? (value / total) * 100 : 0;
      return { label, valueMb: value, percent };
    })
    .filter(Boolean) as { label: string; valueMb: number; percent: number }[];
};

const buildKnowledgeEntries = (data?: SystemHealthData["knowledge_files"]) => {
  if (!data) return [] as KnowledgeFileEntry[];
  const map = new Map<string, KnowledgeFileEntry>();

  (data.files ?? []).forEach((entry) => {
    map.set(entry.file, { ...entry });
  });

  (data.expired ?? []).forEach((entry) => {
    if (typeof entry === "string") {
      map.set(entry, { file: entry, statusOverride: "expired" });
    } else {
      map.set(entry.file, { ...entry, statusOverride: "expired" });
    }
  });

  (data.missing_header ?? []).forEach((file) => {
    const current = map.get(file) ?? { file };
    map.set(file, { ...current, statusOverride: "missing" });
  });

  return Array.from(map.values()).sort((a, b) => a.file.localeCompare(b.file));
};

const buildLogHref = (date: Date | null) => {
  if (!date) return { pathLabel: "—", href: undefined };
  const isoDate = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const relativePath = `~/.openclaw/logs/health-check-${isoDate}.md`;
  const absolutePath = process.env.HOME
    ? path.join(process.env.HOME, ".openclaw", "logs", `health-check-${isoDate}.md`)
    : undefined;
  const href = absolutePath ? `file://${absolutePath}` : undefined;
  return { pathLabel: relativePath, href };
};

export default function HealthPage() {
  const healthData = readHealthData();

  if (!healthData) {
    return (
      <AppShell
        eyebrow="Operations"
        title="System Health"
        description="Mission Control can't find the latest Swiss health payload."
      >
        <div className="rounded-3xl border border-border/80 bg-[#0f131b] p-10 text-center text-sm text-gray-400">
          No health data yet — Swiss daily job not configured.
        </div>
      </AppShell>
    );
  }

  const { label: lastUpdatedLabel, date: timestampDate } = formatTimestamp(healthData.timestamp);
  const logInfo = buildLogHref(timestampDate);
  const diskCopy = formatDiskCopy(
    healthData.system?.disk?.free_gb,
    healthData.system?.disk?.total_gb,
    healthData.system?.disk?.used_pct,
  );
  const ramCopy = formatRamCopy(healthData.system?.ram?.used_pct);
  const diskVariant = getThresholdVariant(healthData.system?.disk?.used_pct);
  const ramVariant = getThresholdVariant(healthData.system?.ram?.used_pct);

  const ollamaStatus = healthData.system?.ollama?.status ?? "unknown";
  const ollamaHealthy = ollamaStatus === "healthy";
  const gatewayStatus = healthData.system?.gateway?.status ?? "unknown";
  const gatewayHealthy = gatewayStatus === "healthy";

  const diskItems = buildDiskItems(healthData.disk_usage);
  const knowledgeEntries = buildKnowledgeEntries(healthData.knowledge_files);

  return (
    <AppShell
      eyebrow="Operations"
      title="System Health"
      description="Swiss daily telemetry: storage footprint, runtime services, and knowledge freshness."
    >
      <div className="space-y-6">
        <section>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SystemStatusCard
              label="Disk"
              primaryValue={diskCopy.primary}
              secondaryValue={diskCopy.secondary}
              statusLabel={diskVariant === "ok" ? "Healthy" : diskVariant === "warning" ? "Monitor" : diskVariant === "critical" ? "Critical" : "Unknown"}
              variant={diskVariant}
            />
            <SystemStatusCard
              label="RAM"
              primaryValue={ramCopy.primary}
              secondaryValue={ramCopy.secondary}
              statusLabel={ramVariant === "ok" ? "Healthy" : ramVariant === "warning" ? "Monitor" : ramVariant === "critical" ? "Critical" : "Unknown"}
              variant={ramVariant}
            />
            <SystemStatusCard
              label="Ollama"
              primaryValue={ollamaHealthy ? "Healthy" : (ollamaStatus ?? "Unknown")}
              secondaryValue={`${healthData.system?.ollama?.models_loaded ?? 0} models loaded`}
              statusLabel={ollamaHealthy ? "Healthy" : "Not running"}
              variant={ollamaHealthy ? "ok" : "critical"}
            />
            <SystemStatusCard
              label="Gateway"
              primaryValue={gatewayHealthy ? "Healthy" : (gatewayStatus ?? "Unknown")}
              secondaryValue="Message bus"
              statusLabel={gatewayHealthy ? "Healthy" : "Unhealthy"}
              variant={gatewayHealthy ? "ok" : "critical"}
            />
          </div>
        </section>

        <section>
          <DiskUsageChart items={diskItems} totalMb={healthData.disk_usage?.total_mb} />
        </section>

        <section>
          <KnowledgeFilesTable entries={knowledgeEntries} />
        </section>

        <section>
          <div className="rounded-3xl border border-border/80 bg-[#0f131b] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent-cyan/70">Last Check</p>
                <p className="mt-2 text-xl font-semibold text-white">Last updated: {lastUpdatedLabel}</p>
                <p className="text-sm text-gray-400">Data updated by Swiss daily at 08:00 AM</p>
              </div>
              <div className="flex flex-col gap-2 text-sm text-gray-300">
                <div>
                  <span className="font-mono text-xs text-gray-500">Log file:</span>
                  <div className="mt-1 font-mono text-xs text-gray-200">
                    {logInfo.href ? (
                      <a
                        href={logInfo.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-cyan hover:underline"
                      >
                        {logInfo.pathLabel}
                      </a>
                    ) : (
                      logInfo.pathLabel
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Swiss writes json → Mission Control reads server-side. No polling.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
