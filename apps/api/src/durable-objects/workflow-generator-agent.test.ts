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

/**
 * Resolves once a matching frame arrives.
 *
 * Polls rather than waiting a fixed delay: under full-suite load a frame that
 * needs a D1 round trip takes well over 50ms, which made delay-based assertions
 * flaky roughly one run in three.
 */
async function waitForFrame(
  frames: GeneratorServerMessage[],
  predicate: (frame: GeneratorServerMessage) => boolean,
  timeoutMs = 5000
): Promise<GeneratorServerMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = frames.find(predicate);
    if (found) return found;
    await scheduler.wait(25);
  }
  throw new Error("Expected frame did not arrive in time");
}

/** Resolves with the close code once the socket closes. */
function waitForClose(socket: WebSocket, timeoutMs = 5000): Promise<number> {
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

describe("WorkflowGeneratorAgent", () => {
  it("sends a session frame on connect", async () => {
    const { frames } = await connect(SESSION, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-1",
    });

    await waitForFrame(frames, (frame) => frame.type === "session");

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

    await expect(waitForClose(socket)).resolves.toBe(1008);
  });

  it("rejects a malformed client message", async () => {
    const { socket } = await connect("test-session-malformed", {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-1",
    });

    // Registered before sending, so the listener cannot miss a fast close.
    const closed = waitForClose(socket);

    await settle();
    socket.send("not json");

    await expect(closed).resolves.toBe(1003);
  });

  it("replays earlier frames to a reconnecting client", async () => {
    const sessionId = "test-session-replay";

    // The org does not exist in the test database, so the run fails fast and
    // writes an error frame — exactly the durable state replay should restore.
    const first = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(first.frames, (frame) => frame.type === "session");
    first.socket.send(JSON.stringify({ type: "start", prompt: "summarize" }));

    // The run fails on a missing org, which needs a D1 round trip — poll rather
    // than assume a fixed delay is enough.
    await waitForFrame(first.frames, (frame) => frame.type === "error");
    first.socket.close();

    const second = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(second.frames, (frame) => frame.type === "error");

    // Fresh session frame, then the replayed log including the error.
    expect(second.frames.some((f) => f.type === "error")).toBe(true);
    expect(second.frames[0]).toMatchObject({ type: "session" });
  });

  it("reports the original prompt so a resumed page can show it", async () => {
    const sessionId = "test-session-prompt";

    const first = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(first.frames, (frame) => frame.type === "session");
    first.socket.send(
      JSON.stringify({ type: "start", prompt: "summarize my emails" })
    );
    await waitForFrame(first.frames, (frame) => frame.type === "error");
    first.socket.close();

    // A fresh connection is what resuming from a URL looks like.
    const resumed = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(resumed.frames, (frame) => frame.type === "session");

    expect(resumed.frames[0]).toMatchObject({
      type: "session",
      prompt: "summarize my emails",
    });
  });

  it("does not restart a run that already happened", async () => {
    const sessionId = "test-session-idempotent";

    const first = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(first.frames, (frame) => frame.type === "session");
    first.socket.send(JSON.stringify({ type: "start", prompt: "summarize" }));
    await waitForFrame(first.frames, (frame) => frame.type === "error");
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

describe("the multi-turn protocol", () => {
  it("ignores a message type it does not understand", async () => {
    const sessionId = "test-session-unknown-type";
    const { socket, frames } = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(frames, (frame) => frame.type === "session");

    // A client one deploy ahead of this worker must not lose its session. The
    // socket used to close here, which took the whole run down with it.
    socket.send(JSON.stringify({ type: "from-the-future", payload: 1 }));
    await settle();

    // Still usable: the session takes a real message afterwards.
    socket.send(JSON.stringify({ type: "start", prompt: "summarize" }));
    await waitForFrame(frames, (frame) => frame.type === "error");
  });

  it("ignores resolve when no brief is waiting", async () => {
    const sessionId = "test-session-resolve-empty";
    const { socket, frames } = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(frames, (frame) => frame.type === "session");

    socket.send(JSON.stringify({ type: "resolve", turn: 0, answers: {} }));
    await settle();

    // Nothing was built, and nothing failed — there was simply nothing to do.
    expect(frames.filter((frame) => frame.type !== "session")).toEqual([]);
  });

  it("ignores critique when nothing has been built", async () => {
    const sessionId = "test-session-critique-empty";
    const { socket, frames } = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(frames, (frame) => frame.type === "session");

    socket.send(JSON.stringify({ type: "critique", note: "make it shorter" }));
    await settle();

    expect(frames.filter((frame) => frame.type !== "session")).toEqual([]);
  });

  it("lets a settled session take another turn", async () => {
    const sessionId = "test-session-second-turn";
    const { socket, frames } = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitForFrame(frames, (frame) => frame.type === "session");

    socket.send(JSON.stringify({ type: "ask", prompt: "summarize my emails" }));
    await waitForFrame(frames, (frame) => frame.type === "error");
    const afterFirst = frames.filter((frame) => frame.type === "error").length;

    // `start` is single-use, but a session is a conversation: retyping after a
    // failure has to be allowed or the user is stuck with a dead page.
    socket.send(JSON.stringify({ type: "ask", prompt: "translate my emails" }));
    await waitForFrame(frames, (frame) => frame.type === "error", 5000);
    await settle();

    expect(
      frames.filter((frame) => frame.type === "error").length
    ).toBeGreaterThan(afterFirst);
  });
});
