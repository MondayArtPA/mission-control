const DEFAULT_BASE_URL = process.env.MISSION_CONTROL_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function resolveBaseUrl(baseUrl = DEFAULT_BASE_URL) {
  return String(baseUrl).replace(/\/$/, "");
}

export async function postMissionControlEvent({
  agent,
  type = "task",
  message,
  metadata = {},
  baseUrl,
}) {
  if (!agent || !message) {
    throw new Error("agent and message are required");
  }

  const target = `${resolveBaseUrl(baseUrl)}/api/events`;
  const res = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent,
      type,
      message,
      metadata,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to post event (${res.status}): ${text}`);
  }

  return text;
}
