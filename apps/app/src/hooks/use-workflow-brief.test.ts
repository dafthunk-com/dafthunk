import type {
  GeneratorServerMessage,
  RehearsalReport,
  WorkflowExecution,
} from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { INITIAL_BRIEF_STATE, reduce } from "./use-workflow-brief";

/**
 * The reducer's rehearsal contract. Frames are replayed verbatim on
 * reconnect, so everything here has to hold for a replay as much as for a
 * live stream — including frames from sessions recorded before this
 * protocol existed.
 */

const REPORT: RehearsalReport = {
  nodes: [{ nodeId: "mail" }, { nodeId: "post", provider: "x" }],
  unconnectedProviders: ["x"],
};

const EXECUTION = {
  id: "exec-1",
  workflowId: "wf-1",
  status: "completed",
  nodeExecutions: [],
} as unknown as WorkflowExecution;

function play(frames: GeneratorServerMessage[]) {
  return frames.reduce(reduce, INITIAL_BRIEF_STATE);
}

describe("the rehearsal report in the reducer", () => {
  it("lands with run_result and reaches the screen", () => {
    const state = play([
      {
        type: "run_result",
        execution: EXECUTION,
        rehearsal: REPORT,
      },
    ]);

    expect(state.rehearsal).toEqual(REPORT);
    expect(state.execution).toBe(EXECUTION);
  });

  it("clears with the run it describes when a new turn starts", () => {
    const state = play([
      { type: "run_result", execution: EXECUTION, rehearsal: REPORT },
      { type: "resolved", turn: 1, sentence: "Do it differently" },
    ]);

    // A report left standing would caption the next run with the last run's
    // stubs.
    expect(state.rehearsal).toBeUndefined();
    expect(state.execution).toBeUndefined();
  });

  it("ignores a replayed frame from the retired approval protocol", () => {
    const stale = {
      type: "approval_required",
      actions: [{ nodeId: "mail" }],
    } as unknown as GeneratorServerMessage;

    const state = play([stale]);

    // Old sessions' logs replay into new clients for up to an hour. Unknown
    // frame types must pass through the default case unchanged — not crash,
    // not resurrect the gate.
    expect(state).toMatchObject({ status: "idle", replayed: true });
  });

  it("ignores frame types it has never heard of", () => {
    const future = {
      type: "from-the-future",
      payload: 1,
    } as unknown as GeneratorServerMessage;

    expect(play([future])).toMatchObject({ status: "idle" });
  });
});

/**
 * The opening move, where the browser knows something the server does not yet.
 *
 * `ask` opens the socket and sends the request in the same breath, so the
 * `session` frame the server answers the connection with describes the instant
 * *before* that request landed. Treating it as a correction dropped the screen
 * back to the front door for one round trip.
 */
describe("the session frame against an optimistic turn", () => {
  /** What `ask` sets before anything has been sent. */
  const OPTIMISTIC = {
    ...INITIAL_BRIEF_STATE,
    status: "running",
    phase: "briefing",
    sessionLoaded: true,
  } as const;

  const idleSession: GeneratorServerMessage = {
    type: "session",
    sessionId: "s-1",
    status: "idle",
    protocol: 2,
  } as GeneratorServerMessage;

  it("leaves a turn the browser already started alone", () => {
    const state = reduce(OPTIMISTIC, idleSession);

    expect(state.status).toBe("running");
    expect(state.phase).toBe("briefing");
  });

  it("keeps the narration continuous across the connection", () => {
    const state = [
      idleSession,
      {
        type: "phase",
        phase: "briefing",
        label: "Reading that back",
      } as GeneratorServerMessage,
    ].reduce(reduce, OPTIMISTIC);

    // One phase, named once: the optimistic line and the server's are the same
    // words, and nothing blanked the screen between them.
    expect(state.phaseLabel).toBe("Reading that back");
    expect(state.phaseTrail).toEqual([]);
  });

  it("drops a pointer the browser kept from an earlier session", () => {
    const state = reduce(
      { ...OPTIMISTIC, workflowId: "wf-old", executionId: "ex-old" },
      idleSession
    );

    expect(state.workflowId).toBeUndefined();
    expect(state.executionId).toBeUndefined();
  });

  it("still resets everything for a session the server does hold", () => {
    const state = reduce(
      { ...OPTIMISTIC, notes: [{ level: "warn", message: "stale" }] },
      {
        type: "session",
        sessionId: "s-1",
        status: "awaiting",
        prompt: "a digest",
        protocol: 2,
      } as GeneratorServerMessage
    );

    // A replay follows this one, so local state has to go.
    expect(state.status).toBe("awaiting");
    expect(state.prompt).toBe("a digest");
    expect(state.notes).toEqual([]);
    expect(state.phase).toBeUndefined();
  });
});
