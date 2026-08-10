import type { GeneratorServerMessage } from "@dafthunk/types";
import { beforeAll, describe, expect, it } from "vitest";

import {
  applyMigrations,
  openSocket,
  settle,
  type TestSocket,
  waitFor,
  waitForClose,
  waitForFrames,
} from "./test-helpers";

/**
 * Protocol-level tests for the generator socket, hosted by WorkflowAgent.
 *
 * The generation logic itself is covered by the pipeline tests, which stub the
 * model. What matters here is the transport contract: identity is enforced, a
 * session frame lands on connect, and the frame log replays on reconnect so a
 * client that drops out catches up instead of restarting the run.
 */

beforeAll(applyMigrations);

const SESSION = "test-session-1";

function connect(
  sessionId: string,
  headers: Record<string, string>
): Promise<TestSocket<GeneratorServerMessage>> {
  return openSocket<GeneratorServerMessage>(sessionId, "generation", headers);
}

describe("the generation protocol on WorkflowAgent", () => {
  it("sends a session frame on connect", async () => {
    const { frames } = await connect(SESSION, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-1",
    });

    await waitFor(frames, (frame) => frame.type === "session");

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
    await waitFor(first.frames, (frame) => frame.type === "session");
    first.socket.send(JSON.stringify({ type: "ask", prompt: "summarize" }));

    // The run fails on a missing org, which needs a D1 round trip — poll rather
    // than assume a fixed delay is enough.
    await waitFor(first.frames, (frame) => frame.type === "error");
    first.socket.close();

    const second = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitFor(second.frames, (frame) => frame.type === "error");

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
    await waitFor(first.frames, (frame) => frame.type === "session");
    first.socket.send(
      JSON.stringify({ type: "ask", prompt: "summarize my emails" })
    );
    await waitFor(first.frames, (frame) => frame.type === "error");
    first.socket.close();

    // A fresh connection is what resuming from a URL looks like.
    const resumed = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitFor(resumed.frames, (frame) => frame.type === "session");

    expect(resumed.frames[0]).toMatchObject({
      type: "session",
      prompt: "summarize my emails",
    });
  });
});

describe("the multi-turn protocol", () => {
  it("ignores a message type it does not understand", async () => {
    const sessionId = "test-session-unknown-type";
    const { socket, frames } = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitFor(frames, (frame) => frame.type === "session");

    // A client one deploy ahead of this worker must not lose its session. The
    // socket used to close here, which took the whole run down with it.
    socket.send(JSON.stringify({ type: "from-the-future", payload: 1 }));
    await settle();

    // Still usable: the session takes a real message afterwards.
    socket.send(JSON.stringify({ type: "ask", prompt: "summarize" }));
    await waitFor(frames, (frame) => frame.type === "error");
  });

  it("ignores resolve when no brief is waiting", async () => {
    const sessionId = "test-session-resolve-empty";
    const { socket, frames } = await connect(sessionId, {
      "X-User-Id": "user-1",
      "X-Organization-Id": "org-missing",
    });
    await waitFor(frames, (frame) => frame.type === "session");

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
    await waitFor(frames, (frame) => frame.type === "session");

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
    await waitFor(frames, (frame) => frame.type === "session");

    socket.send(JSON.stringify({ type: "ask", prompt: "summarize my emails" }));
    await waitFor(frames, (frame) => frame.type === "error");
    const afterFirst = frames.filter((frame) => frame.type === "error").length;

    // A session is a conversation: retyping after a failure has to be
    // allowed or the user is stuck with a dead page.
    socket.send(JSON.stringify({ type: "ask", prompt: "translate my emails" }));

    // Wait for a *second* error, counted — not merely for "an error exists",
    // which the first one already satisfies. That wait returned immediately
    // and left the assertion racing the second turn, failing about one run in
    // four.
    await waitForFrames(
      frames,
      (frame) => frame.type === "error",
      afterFirst + 1
    );

    expect(
      frames.filter((frame) => frame.type === "error").length
    ).toBeGreaterThan(afterFirst);
  });
});
