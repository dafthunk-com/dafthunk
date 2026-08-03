import { describe, expect, it } from "vitest";

import { checkGenerationRateLimit } from "./rate-limit";

/** Minimal in-memory stand-in for the KV binding. */
function fakeKV() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

const ORG = "org-1";
const HOUR = 60 * 60 * 1000;

describe("checkGenerationRateLimit", () => {
  it("allows the first ten attempts and refuses the eleventh", async () => {
    const kv = fakeKV();
    const now = 1_000_000;

    for (let i = 0; i < 10; i++) {
      const verdict = await checkGenerationRateLimit(kv, ORG, now + i);
      expect(verdict.allowed).toBe(true);
    }

    const blocked = await checkGenerationRateLimit(kv, ORG, now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts down the remaining allowance", async () => {
    const kv = fakeKV();
    const first = await checkGenerationRateLimit(kv, ORG, 1_000_000);
    expect(first.remaining).toBe(9);
  });

  it("forgets attempts once the window has passed", async () => {
    const kv = fakeKV();
    const now = 1_000_000;

    for (let i = 0; i < 10; i++) {
      await checkGenerationRateLimit(kv, ORG, now + i);
    }
    expect((await checkGenerationRateLimit(kv, ORG, now + 10)).allowed).toBe(
      false
    );

    const later = await checkGenerationRateLimit(kv, ORG, now + HOUR + 1);
    expect(later.allowed).toBe(true);
  });

  it("keeps organizations independent", async () => {
    const kv = fakeKV();
    const now = 1_000_000;

    for (let i = 0; i < 10; i++) {
      await checkGenerationRateLimit(kv, ORG, now + i);
    }

    expect((await checkGenerationRateLimit(kv, "org-2", now)).allowed).toBe(
      true
    );
  });
});
