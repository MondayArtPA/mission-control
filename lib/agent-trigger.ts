/**
 * Agent Trigger — triggers OpenClaw agent via Gateway WebSocket API
 *
 * OpenClaw Gateway Protocol v3:
 * 1. Connect to ws://127.0.0.1:18789/?token=<gateway_token>
 * 2. Server sends: {"type":"event","event":"connect.challenge","payload":{"nonce":"...","ts":...}}
 * 3. Client sends: {"type":"req","id":"...","method":"connect","params":{...}}
 *    - params includes protocol version, client info, role, scopes, auth, device identity
 *    - device.signature = Ed25519 sign of: v2|deviceId|clientId|clientMode|role|scopes|signedAt|token|nonce
 * 4. Server sends hello-ok → connection established
 * 5. Client sends agent request
 *
 * Sources:
 * - https://docs.openclaw.ai/gateway/protocol
 * - https://deepwiki.com/openclaw/openclaw/2.2-authentication-and-device-pairing
 */
import { readFile } from "fs/promises";
import { join } from "path";
import { sign, createPrivateKey } from "crypto";
import WebSocket from "ws";
import type { TaskRecord } from "@/types/task";
import { getAgentTelegramConfig } from "./telegram-dispatch";

const GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT || "18789";
const OPENCLAW_HOME = process.env.OPENCLAW_HOME || join(process.env.HOME || "/Users/Openclaw", ".openclaw");

export interface TriggerResult {
  success: boolean;
  method: "gateway-ws";
  error?: string;
  responseText?: string;
}

/* ─── Helpers ─── */

function formatAgentPrompt(task: TaskRecord): string {
  const priority = task.priority === "CRITICAL" ? "CRITICAL — ทำทันที" : `Priority: ${task.priority}`;
  const desc = task.description ? `\nรายละเอียด: ${task.description}` : "";
  return `[Mission Control — งานใหม่ ไม่เกี่ยวกับ conversation ก่อนหน้า]\n${priority}\n\nTask: ${task.title}${desc}\n\nTask ID: ${task.id}\nทำงานนี้ให้เสร็จแล้วตอบผลลัพธ์กลับมาเลย ไม่ต้องถามเพิ่ม`;
}

function generateId(): string {
  return `mc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Auth / Identity ─── */

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyB64url: string;
  operatorToken: string;
}

let _gatewayToken: string | null = null;
let _device: DeviceIdentity | null = null;

async function getGatewayToken(): Promise<string> {
  if (_gatewayToken) return _gatewayToken;
  if (process.env.OPENCLAW_GATEWAY_TOKEN) {
    _gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    return _gatewayToken;
  }
  const raw = await readFile(join(OPENCLAW_HOME, "openclaw.json"), "utf-8");
  const config = JSON.parse(raw);
  const token = config?.gateway?.auth?.token;
  if (!token) throw new Error("No gateway.auth.token in openclaw.json");
  _gatewayToken = token;
  return token;
}

async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (_device) return _device;

  // Read device keypair
  const deviceRaw = await readFile(join(OPENCLAW_HOME, "identity", "device.json"), "utf-8");
  const device = JSON.parse(deviceRaw);

  // Read device auth tokens
  const authRaw = await readFile(join(OPENCLAW_HOME, "identity", "device-auth.json"), "utf-8");
  const auth = JSON.parse(authRaw);

  const operatorToken = auth?.tokens?.operator?.token;
  if (!operatorToken) throw new Error("No operator token in device-auth.json");

  // Extract raw public key bytes from PEM for base64url encoding
  // The PEM contains a 44-byte DER with 12-byte header + 32-byte key
  const pubPem = device.publicKeyPem as string;
  const pubB64 = pubPem.replace(/-----BEGIN PUBLIC KEY-----/, "").replace(/-----END PUBLIC KEY-----/, "").replace(/\s/g, "");
  const pubDer = Buffer.from(pubB64, "base64");
  // Ed25519 SPKI DER: 12-byte header + 32-byte raw key
  const rawPubKey = pubDer.subarray(pubDer.length - 32);
  const publicKeyB64url = rawPubKey.toString("base64url");

  _device = {
    deviceId: device.deviceId,
    publicKeyPem: device.publicKeyPem,
    privateKeyPem: device.privateKeyPem,
    publicKeyB64url,
    operatorToken,
  };
  return _device;
}

/**
 * Sign the v2 connect payload using Ed25519 private key.
 *
 * v2 payload format: v2|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}
 */
function signConnectPayload(
  device: DeviceIdentity,
  gatewayToken: string,
  nonce: string,
  signedAt: number,
): string {
  const clientId = "cli";
  const clientMode = "cli";
  const role = "operator";
  const scopes = "operator.admin"; // sorted, comma-joined

  // Server verifies with auth.token (gateway token), NOT device operator token
  // See: https://github.com/openclaw/openclaw/issues/39667
  const payload = `v2|${device.deviceId}|${clientId}|${clientMode}|${role}|${scopes}|${signedAt}|${gatewayToken}|${nonce}`;

  console.log(`[agent-trigger] Signing payload: ${payload.slice(0, 60)}...`);

  const privateKey = createPrivateKey(device.privateKeyPem);
  const signature = sign(null, Buffer.from(payload), privateKey);
  return signature.toString("base64url");
}

/* ─── Main trigger function ─── */

export async function triggerAgent(task: TaskRecord): Promise<TriggerResult> {
  const agentName = task.agent === "monday" ? "main" : task.agent;

  let gatewayToken: string;
  let device: DeviceIdentity;

  try {
    gatewayToken = await getGatewayToken();
    device = await getDeviceIdentity();
  } catch (err) {
    return { success: false, method: "gateway-ws", error: `Auth error: ${(err as Error).message}` };
  }

  console.log(`[agent-trigger] Triggering agent="${agentName}" for task="${task.id}"`);
  const result = await connectAndTrigger(agentName, task, gatewayToken, device);

  // If agent completed successfully, deliver response to Telegram
  if (result.success && result.responseText) {
    try {
      const agentId = task.agent as import("@/types/task").AgentName;
      const tgConfig = await getAgentTelegramConfig(agentId);
      if (tgConfig) {
        const replyText = `✅ *Task Completed: ${task.title}*\n\n${result.responseText}`;
        const tgUrl = `https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`;
        const resp = await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgConfig.chatId,
            text: replyText,
            parse_mode: "Markdown",
          }),
        });
        const tgResult = await resp.json();
        console.log(`[agent-trigger] Telegram delivery: ${resp.ok ? "OK" : "FAIL"} messageId=${tgResult?.result?.message_id ?? "n/a"}`);
      } else {
        console.log(`[agent-trigger] No Telegram config for agent "${agentId}", skipping delivery`);
      }
    } catch (tgErr) {
      console.error(`[agent-trigger] Telegram delivery error: ${(tgErr as Error).message}`);
    }
  }

  return result;
}

/* ─── WebSocket connection ─── */

function connectAndTrigger(
  agentName: string,
  task: TaskRecord,
  gatewayToken: string,
  device: DeviceIdentity,
): Promise<TriggerResult> {
  const requestId = generateId();
  const port = Number(GATEWAY_PORT);
  const url = `ws://127.0.0.1:${port}/?token=${encodeURIComponent(gatewayToken)}`;

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (result: TriggerResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* ignore */ }
      resolve(result);
    };

    // agent.wait can take minutes — generous 120s timeout
    const timer = setTimeout(() => {
      safeResolve({ success: false, method: "gateway-ws", error: "WebSocket timeout (120s)" });
    }, 120_000);

    const ws = new WebSocket(url, {
      headers: { "User-Agent": "openclaw-mission-control/1.1.0" },
      handshakeTimeout: 5000,
    });

    let agentRequestSent = false;
    let waitRequestSent = false;
    let collectedText = "";  // Collect streaming assistant text from events
    const agentRequestId = requestId;       // id for "agent" request
    const waitRequestId = generateId();     // id for "agent.wait" request

    ws.on("open", () => {
      console.log("[agent-trigger] WebSocket connected, waiting for challenge...");
    });

    ws.on("message", (data) => {
      const text = data.toString();
      // Only log non-streaming events to avoid log spam
      if (!text.includes('"stream":"assistant"') && !text.includes('"event":"tick"') && !text.includes('"event":"health"')) {
        console.log(`[agent-trigger] << ${text.slice(0, 300)}`);
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }

      // ── Collect streaming assistant text from events ──
      if (msg.type === "event" && msg.event === "agent") {
        const p = msg.payload as { stream?: string; data?: { text?: string } };
        if (p?.stream === "assistant" && p?.data?.text) {
          collectedText = p.data.text;  // "text" field contains full accumulated text
        }
      }

      // ── connect.challenge → send connect request ──
      if (msg.type === "event" && msg.event === "connect.challenge") {
        const payload = msg.payload as { nonce: string; ts: number };
        console.log(`[agent-trigger] Got challenge, nonce=${payload.nonce}`);

        const signedAt = Date.now();
        const signature = signConnectPayload(device, gatewayToken, payload.nonce, signedAt);

        const connectReq = {
          type: "req",
          id: generateId(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "cli",
              version: "1.1.0",
              platform: "darwin",
              mode: "cli",
            },
            role: "operator",
            scopes: ["operator.admin"],
            caps: [],
            commands: [],
            auth: {
              token: gatewayToken,
            },
            locale: "th-TH",
            userAgent: "openclaw-mission-control/1.1.0",
            device: {
              id: device.deviceId,
              publicKey: device.publicKeyB64url,
              signature,
              signedAt,
              nonce: payload.nonce,
            },
          },
        };

        console.log(`[agent-trigger] >> Sending connect request (type=req, method=connect)`);
        ws.send(JSON.stringify(connectReq));
        return;
      }

      // ── Step 2 response: agent.wait completed → extract response text ──
      if (msg.id === waitRequestId && msg.type === "res") {
        if (msg.error) {
          const err = msg.error as { code?: string; message?: string };
          console.error(`[agent-trigger] agent.wait error: ${JSON.stringify(err)}`);
          safeResolve({
            success: false,
            method: "gateway-ws",
            error: `${err.code || "ERROR"}: ${String(err.message || "unknown").slice(0, 150)}`,
          });
        } else {
          const payload = msg.payload as {
            status?: string;
            summary?: string;
            result?: { payloads?: Array<{ text?: string }> };
          };
          // agent.wait response doesn't include text — use collected streaming text
          const responseText = payload?.result?.payloads?.[0]?.text || collectedText || "";
          const status = payload?.status || "unknown";
          console.log(`[agent-trigger] Agent completed! status=${status}, responseLength=${responseText.length}, collectedTextLength=${collectedText.length}`);

          // Treat error/cancelled as hard failure
          // Timeout with collected text = partial success (agent was working, gateway timed out)
          // Timeout without text = failure
          const isHardFail = status === "error" || status === "cancelled";
          const isTimeout = status === "timeout";
          const isEmptyResponse = !responseText || responseText === "NO_REPL" || responseText.trim() === "";

          if (isHardFail) {
            safeResolve({ success: false, method: "gateway-ws", error: `Agent ${status}` });
          } else if (isTimeout && collectedText.trim().length > 10) {
            // Agent was streaming content but gateway timed out — treat as partial success
            console.log(`[agent-trigger] Timeout but has collected text (${collectedText.length} chars), treating as success`);
            safeResolve({ success: true, method: "gateway-ws", responseText: collectedText });
          } else if (isTimeout || isEmptyResponse) {
            const reason = isTimeout ? "Agent timeout" : `Agent returned no useful response (${responseText || "empty"})`;
            safeResolve({ success: false, method: "gateway-ws", error: reason });
          } else {
            safeResolve({ success: true, method: "gateway-ws", responseText });
          }
        }
        return;
      }

      // ── Step 1 response: agent accepted → send agent.wait with runId ──
      if (msg.id === agentRequestId && msg.type === "res") {
        if (msg.error) {
          const err = msg.error as { code?: string; message?: string };
          safeResolve({
            success: false,
            method: "gateway-ws",
            error: `${err.code || "ERROR"}: ${String(err.message || "unknown").slice(0, 150)}`,
          });
        } else {
          const payload = msg.payload as { runId?: string; status?: string };
          const runId = payload?.runId;
          console.log(`[agent-trigger] Agent accepted! runId=${runId}, sending agent.wait...`);
          if (runId && !waitRequestSent) {
            waitRequestSent = true;
            const waitReq = {
              type: "req",
              id: waitRequestId,
              method: "agent.wait",
              params: { runId },
            };
            console.log(`[agent-trigger] >> Sending agent.wait (runId=${runId})`);
            ws.send(JSON.stringify(waitReq));
          }
        }
        return;
      }

      // ── hello-ok / connect success → send agent request (Step 1) ──
      if (msg.type === "res" && msg.ok && !agentRequestSent) {
        console.log("[agent-trigger] Connected! Sending agent request...");
        sendAgentRequest(ws, agentName, task, agentRequestId);
        agentRequestSent = true;
        return;
      }

      // ── connect error → log but try anyway ──
      if (msg.type === "res" && msg.error && !agentRequestSent) {
        const err = msg.error as { code?: string; message?: string };
        console.error(`[agent-trigger] Connect error: ${JSON.stringify(err)}`);
        sendAgentRequest(ws, agentName, task, agentRequestId);
        agentRequestSent = true;
        return;
      }
    });

    ws.on("error", (err) => {
      console.error(`[agent-trigger] WS error: ${err.message}`);
      safeResolve({ success: false, method: "gateway-ws", error: `WS error: ${err.message}` });
    });

    ws.on("close", (code, reason) => {
      const r = reason?.toString() || "n/a";
      console.log(`[agent-trigger] WS closed: code=${code} reason=${r}`);
      safeResolve({ success: false, method: "gateway-ws", error: `Connection closed (code=${code}, reason=${r})` });
    });
  });
}

/**
 * Send agent trigger request using gateway's native request format.
 *
 * Correct params for the "agent" method (per OpenClaw Gateway Protocol v3):
 * - message (string, required) — prompt text
 * - sessionKey (string) — encodes agent + context: "agent:<agentId>:<source>:<type>:<id>"
 * - idempotencyKey (string, required) — unique per request for dedup
 *
 * The agent name is encoded inside sessionKey, NOT as a separate "agent" param.
 * See: https://github.com/openclaw/openclaw/issues/23258
 */
function sendAgentRequest(
  ws: WebSocket,
  agentName: string,
  task: TaskRecord,
  requestId: string,
): void {
  const idempotencyKey = `mc-${task.id}-${Date.now()}`;
  // Use a unique Mission Control session key per task to avoid polluting existing Telegram sessions
  // This ensures clean context — agent only sees the task prompt, not old conversation
  // Telegram delivery happens separately via Bot API after agent completes
  const sessionKey = `agent:${agentName}:mc:task:${task.id}`;
  const message = {
    type: "req",
    id: requestId,
    method: "agent",
    params: {
      message: formatAgentPrompt(task),
      sessionKey,
      idempotencyKey,
    },
  };
  console.log(`[agent-trigger] >> Sending agent request (sessionKey=${sessionKey}, idempotencyKey=${idempotencyKey})`);
  ws.send(JSON.stringify(message));
}
