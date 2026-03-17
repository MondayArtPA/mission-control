/**
 * Telegram Review Tests
 * Run: npx tsx tests/telegram-review.test.ts
 */

import { detectReviewDecision, deriveTaskUpdatesFromDecision } from "../lib/telegram-review";
import type { TaskRecord } from "../types/task";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`❌ ${name}`);
    console.log(`   ${e.message}`);
    failed++;
  }
}

function expect<T>(actual: T) {
  return {
    toBe: (expected: T) => {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toBeDefined: () => {
      if (actual === undefined) throw new Error(`Expected defined, got undefined`);
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null, got ${actual}`);
    },
  };
}

console.log("\n=== detectReviewDecision ===");

test("should detect approve with OK keywords", () => {
  expect(detectReviewDecision("ok")).toBe("approve");
  expect(detectReviewDecision("OK")).toBe("approve");
  expect(detectReviewDecision("ok.")).toBe("approve");
  expect(detectReviewDecision("ได้")).toBe("approve");
  expect(detectReviewDecision("ดีเลย")).toBe("approve");
});

test("should detect approve with emoji", () => {
  expect(detectReviewDecision("👍")).toBe("approve");
  expect(detectReviewDecision("✅")).toBe("approve");
});

test("should detect reject with NO keywords", () => {
  expect(detectReviewDecision("ไม่")).toBe("reject");
  expect(detectReviewDecision("ไม่ได้")).toBe("reject");
  expect(detectReviewDecision("แก้")).toBe("reject");
  expect(detectReviewDecision("fix")).toBe("reject");
});

test("should detect reject with emoji", () => {
  expect(detectReviewDecision("👎")).toBe("reject");
  expect(detectReviewDecision("❌")).toBe("reject");
});

test("should return comment for unknown messages", () => {
  expect(detectReviewDecision("hello")).toBe("comment");
  expect(detectReviewDecision("")).toBe("comment");
});

test("should handle Thai keywords", () => {
  expect(detectReviewDecision("ผ่าน")).toBe("approve");
  expect(detectReviewDecision("ใช่")).toBe("approve");
  expect(detectReviewDecision("ปรับ")).toBe("reject");
  expect(detectReviewDecision("ทำใหม่")).toBe("reject");
});

console.log("\n=== deriveTaskUpdatesFromDecision ===");

const mockTask: TaskRecord = {
  id: "test-1",
  agent: "blueprint",
  title: "Test Task",
  status: "pending",
  priority: "p1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

test("should update task to completed on approve", () => {
  const patch = deriveTaskUpdatesFromDecision(mockTask, "approve", "reviewer");
  expect(patch?.status).toBe("completed");
  expect(patch?.reviewedBy).toBe("reviewer");
  expect(patch?.reviewedAt).toBeDefined();
  expect(patch?.autoComplete).toBe(false);
});

test("should update task to in_progress on reject", () => {
  const patch = deriveTaskUpdatesFromDecision(mockTask, "reject", "reviewer");
  expect(patch?.status).toBe("in_progress");
  expect(patch?.reviewedBy).toBe("reviewer");
  expect(patch?.reviewedAt).toBeDefined();
});

test("should return null on comment", () => {
  const patch = deriveTaskUpdatesFromDecision(mockTask, "comment", "reviewer");
  expect(patch).toBeNull();
});

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
