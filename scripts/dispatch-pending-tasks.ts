#!/usr/bin/env node
/**
 * Dispatch all pending tasks to agents via Telegram
 */

import fs from 'fs';
import path from 'path';

interface Task {
  id: string;
  agent: string;
  priority: string;
  status: string;
  title: string;
  description?: string;
  dispatched?: boolean;
  dispatchedAt?: string | null;
  dispatchMessageId?: number | null;
  dispatchError?: string | null;
}

interface TelegramConfig {
  agents: Record<string, { botToken: string; chatId: string }>;
}

const priorityEmoji: Record<string, string> = {
  Critical: '🔴',
  P1: '🟠',
  P2: '🟡',
  P3: '🔵',
  P4: '⚪',
};

function formatTaskMessage(task: Task): string {
  return `📋 <b>New Task Assigned</b>
━━━━━━━━━━━━━━━━━━━━━━
${priorityEmoji[task.priority] || '⚪'} Priority: ${task.priority}

<b>${task.title}</b>

${task.description || ''}

━━━━━━━━━━━━━━━━━━━━━━
Task ID: ${task.id}
Assigned via Command Center`;
}

async function dispatchTask(task: Task, config: TelegramConfig): Promise<boolean> {
  const agentConfig = config.agents[task.agent];
  if (!agentConfig) {
    console.error(`❌ No Telegram config for agent: ${task.agent}`);
    return false;
  }

  const message = formatTaskMessage(task);
  const url = `https://api.telegram.org/bot${agentConfig.botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: agentConfig.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Dispatched ${task.id} to ${task.agent} (msg: ${data.result.message_id})`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to dispatch ${task.id}: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error dispatching ${task.id}:`, error);
    return false;
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const queueFile = path.join(dataDir, 'task-queue.json');
  const configFile = path.join(dataDir, 'telegram-config.json');

  // Read task queue
  const queueData = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
  const tasks: Task[] = queueData.tasks;

  // Read Telegram config
  const telegramConfig: TelegramConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

  // Find pending tasks (not dispatched)
  const pendingTasks = tasks.filter(
    (t) => t.status === 'queued' && !t.dispatched
  );

  console.log(`📋 Found ${pendingTasks.length} pending tasks to dispatch\n`);

  if (pendingTasks.length === 0) {
    console.log('✨ No pending tasks to dispatch');
    return;
  }

  // Dispatch each task
  for (const task of pendingTasks) {
    console.log(`📤 Dispatching: ${task.title} → ${task.agent}`);
    const success = await dispatchTask(task, telegramConfig);

    if (success) {
      // Update task in queue
      task.dispatched = true;
      task.dispatchedAt = new Date().toISOString();
      task.dispatchMessageId = undefined;
      task.dispatchError = null;
    } else {
      task.dispatched = false;
      task.dispatchError = "Dispatch failed";
    }

    // Rate limit: wait 1 second between dispatches
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Save updated queue
  fs.writeFileSync(queueFile, JSON.stringify(queueData, null, 2));
  console.log('\n✅ All pending tasks dispatched');
}

main().catch(console.error);
