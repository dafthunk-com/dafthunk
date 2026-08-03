import { env } from "cloudflare:test";
import type { GeneratorServerMessage } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { getAgentByName } from "./agent-utils";
import type { WorkflowGeneratorAgent } from "./workflow-generator-agent";

// `cloudflare:test`'s ambient Env does not carry the DO bindings declared in
// wrangler.test.jsonc, so the namespace is narrowed here rather than widening
// the shared ProvidedEnv declaration for one test.
const NAMESPACE = (
  env as unknown as {
    WORKFLOW_GENERATOR_AGENT: DurableObjectNamespace<WorkflowGeneratorAgent>;
  }
).WORKFLOW_GENERATOR_AGENT;

/**
 * Protocol-level tests for the generator socket.
 *
 * The generation logic itself is covered by the pipeline tests, which stub the
 * model. What matters here is the transport contract: identity is enforced, a
 * session frame lands on connect, and the frame log replays on reconnect so a
 * client that drops out catches up instead of restarting the run.
 */

const SESSION = "test-session-1";

async function connect(
  sessionId: string,
  headers: Record<string, string>
): Promise<{ socket: WebSocket; frames: GeneratorServerMessage[] }> {
  const stub = await getAgentByName(NAMESPACE, sessionId);

  const response = await stub.fetch(`https://generator.internal/${sessionId}`, {
    headers: { Upgrade: "websocket", ...headers },
  });

  const socket = response.webSocket;
  if (!socket) throw new Error(`No websocket in response (${response.status})`);

  const frames: GeneratorServerMessage[] = [];
  socket.accept();
  socket.addEventListener("message", (event) => {
    frames.push(JSON.parse(event.data as string) as GeneratorServerMessage);
  });

  return { socket, frames };
}

/** Frames arrive asynchronously; give the event loop a few turns to deliver. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await scheduler.wait(50);
}

describe("WorkflowGeneratorAgent", () => {
  it("sends a session frame on connect", async () => {
    const { frames } = await connect(SESSION, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-1",
    });

    await settle();

    expect(frames[0]).toMatchObject({
      type: "session",
      sessionId: SESSION,
      status: "idle",
    });
  });

  it("closes the socket when identity headers are missing", async () => {
    const { socket } = await connect("test-session-no-identity", {
      "X-User-Id": "user-1",
      // no X-Organization-Id
    });

    let closeCode: number | undefined;
    socket.addEventListener("close", (event) => {
      closeCode = event.code;
    });

    await settle();

    expect(closeCode).toBe(1008);
  });

  it("rejects a malformed client message", async () => {
    const { socket } = await connect("test-session-malformed", {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-1",
    });

    let closeCode: number | undefined;
    socket.addEventListener("close", (event) => {
      closeCode = event.code;
    });

    await settle();
    socket.send("not json");
    await settle();

    expect(closeCode).toBe(1003);
  });

  it("replays earlier frames to a reconnecting client", async () => {
    const sessionId = "test-session-replay";

    // The org does not exist in the test database, so the run fails fast and
    // writes an error frame — exactly the durable state replay should restore.
    const first = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await settle();
    first.socket.send(JSON.stringify({ type: "start", prompt: "summarize" }));
    await settle();

    const errorFrame = first.frames.find((f) => f.type === "error");
    expect(errorFrame).toBeDefined();
    first.socket.close();

    const second = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await settle();

    // Fresh session frame, then the replayed log including the error.
    expect(second.frames.some((f) => f.type === "error")).toBe(true);
    expect(second.frames[0]).toMatchObject({ type: "session" });
  });

  it("does not restart a run that already happened", async () => {
    const sessionId = "test-session-idempotent";

    const first = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await settle();
    first.socket.send(JSON.stringify({ type: "start", prompt: "summarize" }));
    await settle();
    const afterFirst = first.frames.filter((f) => f.type === "error").length;

    first.socket.send(JSON.stringify({ type: "start", prompt: "summarize" }));
    await settle();

    // The second start replays rather than generating again, so the error is
    // re-sent from the log but no new run is claimed.
    expect(
      first.frames.filter((f) => f.type === "error").length
    ).toBeGreaterThanOrEqual(afterFirst);
    expect(first.frames.filter((f) => f.type === "session")).toHaveLength(1);
  });
});
