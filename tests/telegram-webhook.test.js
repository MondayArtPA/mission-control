/**
 * Telegram Webhook Handler Tests
 * Run: node tests/telegram-webhook.test.js
 */

const { handleTelegramReply, resolveTaskFromTelegramReply } = require("../lib/telegram-webhook");

const mockTasks = [
  {
    id: "task-1",
    agent: "blueprint",
    title: "Build dashboard",
    status: "pending",
    priority: "p1",
    dispatchMessageId: 100,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "task-2",
    agent: "monday",
    title: "Write summary",
    status: "in_progress",
    priority: "p2",
    reviewMessageId: 200,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   ${e.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null, got ${actual}`);
    },
    not: {
      toBeNull: () => {
        if (actual === null) throw new Error(`Expected not null, got null`);
      },
    },
  };
}

console.log("\n=== resolveTaskFromTelegramReply ===");

test("should find task by dispatchMessageId", () => {
  const task = resolveTaskFromTelegramReply(mockTasks, 100);
  expect(task.id).toBe("task-1");
});

test("should find task by reviewMessageId", () => {
  const task = resolveTaskFromTelegramReply(mockTasks, 200);
  expect(task.id).toBe("task-2");
});

test("should return null for unknown messageId", () => {
  const task = resolveTaskFromTelegramReply(mockTasks, 999);
  expect(task).toBeNull();
});

console.log("\n=== handleTelegramReply ===");

test("should return null for non-reply messages", () => {
  const update = {
    message: {
      message_id: 1,
      text: "hello",
      from: { id: 123, first_name: "Art" },
    },
  };
  const result = handleTelegramReply(update, mockTasks);
  expect(result).toBeNull();
});

test("should detect approve decision from reply", () => {
  const update = {
    message: {
      message_id: 101,
      text: "ok",
      from: { id: 123, first_name: "Art" },
      reply_to_message: { message_id: 100 },
    },
  };
  const result = handleTelegramReply(update, mockTasks);
  expect(result).not.toBeNull();
  expect(result.decision).toBe("approve");
  expect(result.task.id).toBe("task-1");
});

test("should detect reject decision from reply", () => {
  const update = {
    message: {
      message_id: 102,
      text: "แก้",
      from: { id: 123, first_name: "Art" },
      reply_to_message: { message_id: 100 },
    },
  };
  const result = handleTelegramReply(update, mockTasks);
  expect(result).not.toBeNull();
  expect(result.decision).toBe("reject");
});

test("should detect comment decision", () => {
  const update = {
    message: {
      message_id: 103,
      text: "please add more details",
      from: { id: 123, first_name: "Art" },
      reply_to_message: { message_id: 100 },
    },
  };
  const result = handleTelegramReply(update, mockTasks);
  expect(result).not.toBeNull();
  expect(result.decision).toBe("comment");
  expect(result.patch).toBeNull();
});

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
