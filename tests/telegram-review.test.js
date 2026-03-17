/**
 * Telegram Review Tests
 * Run: node tests/telegram-review.test.js
 */

const { detectReviewDecision, deriveTaskUpdatesFromDecision } = require("../lib/telegram-review");

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

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
