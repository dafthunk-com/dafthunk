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
