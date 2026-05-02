/**
 * Integration test for DynamicWorkerExecutor against the real Cloudflare
 * WorkerLoader binding (`LOADER`). Validates the contract that the JS user-code
 * nodes rely on:
 *   - Code runs in a sandboxed V8 isolate
 *   - `return` propagates the result
 *   - `console.log/warn/error` are captured into logs
 *   - `globalOutbound: null` blocks outbound `fetch()`
 *   - per-call `timeoutMs` is enforced
 */
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { createCodeModeExecutor } from "./code-mode-executor";

describe("DynamicWorkerExecutor (integration)", () => {
  it("executes user code and propagates the return value", async () => {
    const executor = createCodeModeExecutor(
      env as unknown as Parameters<typeof createCodeModeExecutor>[0]
    );
    expect(executor).not.toBeNull();
    if (!executor) return;

    const result = await executor.execute("return 41 + 1;", {});
    expect(result.error).toBeUndefined();
    expect(result.result).toBe(42);
  });

  it("captures console.log into logs", async () => {
    const executor = createCodeModeExecutor(
      env as unknown as Parameters<typeof createCodeModeExecutor>[0]
    );
    if (!executor) throw new Error("LOADER binding unavailable in test env");

    const result = await executor.execute(
      'console.log("hello", "world"); return 1;',
      {}
    );
    expect(result.error).toBeUndefined();
    expect(result.logs).toContain("hello world");
  });

  it("blocks outbound fetch via globalOutbound: null", async () => {
    const executor = createCodeModeExecutor(
      env as unknown as Parameters<typeof createCodeModeExecutor>[0]
    );
    if (!executor) throw new Error("LOADER binding unavailable in test env");

    const result = await executor.execute(
      'try { await fetch("https://example.com"); return "leaked"; } catch (e) { return "blocked"; }',
      {}
    );
    expect(result.error).toBeUndefined();
    expect(result.result).toBe("blocked");
  });

  it("enforces per-call timeout", async () => {
    const executor = createCodeModeExecutor(
      env as unknown as Parameters<typeof createCodeModeExecutor>[0]
    );
    if (!executor) throw new Error("LOADER binding unavailable in test env");

    const result = await executor.execute(
      "await new Promise(r => setTimeout(r, 5000)); return 'done';",
      {},
      { timeoutMs: 100 }
    );
    expect(result.error).toMatch(/timed out/i);
  });
});
