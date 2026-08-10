import type { D1Migration } from "cloudflare:test";
import { applyD1Migrations, env } from "cloudflare:test";

import { getAgentByName } from "../agent-utils";
import type { WorkflowAgent } from "./workflow-agent";

/**
 * Shared plumbing for the workflow-agent suites: the narrowed test env, the
 * socket opener for both protocols, and the polling waiters. Timing fixes
 * live here once — the poll-instead-of-fixed-delay lessons in the waiter
 * docblocks were each learned from a real flake.
 */

// `cloudflare:test`'s ambient Env does not carry the DO bindings declared in
// wrangler.test.jsonc, so the namespace is narrowed here rather than widening
// the shared ProvidedEnv declaration for two tests.
export const testEnv = env as unknown as {
  WORKFLOW_AGENT: DurableObjectNamespace<WorkflowAgent>;
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};

/** The real schema — the generation connect guard reads the workflows table. */
export function applyMigrations(): Promise<void> {
  return applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
}

export interface TestSocket<Frame> {
  socket: WebSocket;
  frames: Frame[];
}

/**
 * Opens one of the merged agent's two protocols.
 *
 * The `X-Agent-Protocol` header is the dispatch contract — it is what the
 * routes stamp in production; the URL merely stays realistic.
 */
export async function openSocket<Frame>(
  workflowId: string,
  kind: "generation" | "editor",
  headers: Record<string, string>
): Promise<TestSocket<Frame>> {
  const stub = await getAgentByName(testEnv.WORKFLOW_AGENT, workflowId);
  const path = kind === "generation" ? "generate" : "ws";
  const response = await stub.fetch(
    `https://agent.internal/org-test/${path}/${workflowId}`,
    {
      headers: {
        Upgrade: "websocket",
        "X-Agent-Protocol": kind,
        ...headers,
      },
    }
  );

  const socket = response.webSocket;
  if (!socket) throw new Error(`No websocket in response (${response.status})`);

  const frames: Frame[] = [];
  socket.accept();
  socket.addEventListener("message", (event) => {
    frames.push(JSON.parse(event.data as string) as Frame);
  });

  return { socket, frames };
}

/** Frames arrive asynchronously; give the event loop a few turns to deliver. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await scheduler.wait(50);
}

/**
 * Resolves once a matching frame arrives.
 *
 * Polls rather than waiting a fixed delay: under full-suite load a frame that
 * needs a D1 round trip takes well over 50ms, which made delay-based assertions
 * flaky roughly one run in three.
 */
export async function waitFor<Frame>(
  frames: Frame[],
  predicate: (frame: Frame) => boolean,
  timeoutMs = 5000
): Promise<Frame> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = frames.find(predicate);
    if (found) return found;
    await scheduler.wait(25);
  }
  throw new Error("Expected frame did not arrive in time");
}

/**
 * Waits until at least `count` frames match.
 *
 * `waitFor` cannot express "one more than last time": its predicate is
 * satisfied by frames that arrived before the action under test, so it returns
 * instantly and the assertion races whatever it was supposed to wait for.
 */
export async function waitForFrames<Frame>(
  frames: Frame[],
  predicate: (frame: Frame) => boolean,
  count: number,
  timeoutMs = 5000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (frames.filter(predicate).length >= count) return;
    await scheduler.wait(25);
  }
  throw new Error(
    `Expected ${count} matching frames, saw ${frames.filter(predicate).length}`
  );
}

/** Resolves with the close code once the socket closes. */
export function waitForClose(
  socket: WebSocket,
  timeoutMs = 5000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Socket did not close in time")),
      timeoutMs
    );
    socket.addEventListener("close", (event) => {
      clearTimeout(timer);
      resolve(event.code);
    });
  });
}
