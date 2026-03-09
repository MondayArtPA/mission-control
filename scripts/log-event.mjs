#!/usr/bin/env node

import { postMissionControlEvent } from "./lib/mission-control-events.mjs";

const [, , agent, type, message, metadataJson] = process.argv;

if (!agent || !message) {
  console.error("Usage: node scripts/log-event.mjs <AGENT> <TYPE> <MESSAGE> [METADATA_JSON]");
  process.exit(1);
}

const metadata = metadataJson ? JSON.parse(metadataJson) : {};

try {
  const data = await postMissionControlEvent({
    agent,
    type: type || "task",
    message,
    metadata,
  });

  console.log(data);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
