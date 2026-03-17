#!/usr/bin/env tsx
import { getAgentTelegramConfig } from "@/lib/telegram-dispatch";
import type { AgentName } from "@/types/task";

async function main() {
  const [agentArg, urlArg] = process.argv.slice(2);
  if (!agentArg || !urlArg) {
    console.error("Usage: tsx scripts/set-telegram-webhook.ts <agentId> <webhookUrl>");
    process.exit(1);
  }

  const agent = agentArg.toLowerCase() as AgentName;
  const config = await getAgentTelegramConfig(agent);
  if (!config) {
    console.error(`No Telegram config found for agent: ${agent}`);
    process.exit(1);
  }

  const endpoint = `https://api.telegram.org/bot${config.botToken}/setWebhook`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: urlArg }),
  });

  const payload = await response.json();
  if (!payload.ok) {
    console.error("Failed to set webhook", payload);
    process.exit(1);
  }

  console.log(`Webhook registered for ${agent} → ${urlArg}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
