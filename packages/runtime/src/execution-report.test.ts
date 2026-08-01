/**
 * The report is what the UI renders and what gets persisted. Its one piece of
 * real judgement is what to say about a node that never ran: while the workflow
 * is live that means "not yet" (executing), but once it has settled it means
 * the node was never going to run at all (idle).
 */

import { describe, expect, it } from "vitest";

import { emptyState, workflowOf } from "./__test-stubs__/runtime-harness";
import { ExecutionGraph } from "./execution-graph";
import { buildNodeExecutions } from "./execution-report";

const graphOf = (edges: string[], extra: string[] = []) =>
  ExecutionGraph.build(workflowOf(edges, extra));

/** Indexes a report by node id for readable assertions. */
const byId = (report: ReturnType<typeof buildNodeExecutions>) =>
  Object.fromEntries(report.map((n) => [n.nodeId, n])) as Record<
    string,
    Record<string, unknown>
  >;

describe("buildNodeExecutions", () => {
  it("emits one entry per node in the workflow", () => {
    const report = buildNodeExecutions(
      graphOf([], ["a", "b", "c"]),
      emptyState()
    );
    expect(report).toHaveLength(3);
  });

  it("reports a completed node with its inputs, outputs and usage", () => {
    const state = emptyState({
      executedNodes: ["a"],
      nodeInputs: { a: { x: 1 } },
      nodeOutputs: { a: { y: 2 } },
      nodeUsage: { a: 4 },
    });

    expect(
      byId(buildNodeExecutions(graphOf([], ["a"]), state)).a
    ).toMatchObject({
      status: "completed",
      inputs: { x: 1 },
      outputs: { y: 2 },
      usage: 4,
    });
  });

  it("defaults a completed node's missing inputs and outputs to empty", () => {
    const state = emptyState({ executedNodes: ["a"] });
    expect(
      byId(buildNodeExecutions(graphOf([], ["a"]), state)).a
    ).toMatchObject({ inputs: {}, outputs: {}, usage: 0 });
  });

  it("reports an errored node with its message and the inputs it received", () => {
    const state = emptyState({
      nodeErrors: { a: "boom" },
      nodeInputs: { a: { x: 1 } },
      nodeUsage: { a: 2 },
    });

    expect(
      byId(buildNodeExecutions(graphOf([], ["a"]), state)).a
    ).toMatchObject({
      status: "error",
      error: "boom",
      inputs: { x: 1 },
      usage: 2,
    });
  });

  it("reports a skipped node with why it was skipped", () => {
    const state = emptyState({
      nodeErrors: { a: "boom" },
      skippedNodes: ["b"],
    });

    expect(
      byId(buildNodeExecutions(graphOf(["a -> b"]), state)).b
    ).toMatchObject({
      status: "skipped",
      outputs: null,
      usage: 0,
      skipReason: "upstream_failure",
      blockedBy: ["a"],
    });
  });

  it("marks an unreached node executing while the run is live", () => {
    const state = emptyState({ executedNodes: ["a"] });
    expect(
      byId(buildNodeExecutions(graphOf(["a -> b"]), state)).b
    ).toMatchObject({ status: "executing", usage: 0 });
  });

  it("marks an unreached node idle once the run has settled", () => {
    // The override is how the runtime says "this run is over" for reasons the
    // state cannot show, such as exhausted credits.
    const state = emptyState();
    expect(
      byId(buildNodeExecutions(graphOf([], ["a"]), state, "exhausted")).a
    ).toMatchObject({ status: "idle" });
  });

  it("lets a pending node outrank every other status", () => {
    // State holds no record of a parked node, so the pending map is the only
    // thing that knows about it.
    const state = emptyState();
    const pending = new Map([
      ["a", { type: "form-response-a", timeout: "30 minutes" }],
    ]);

    expect(
      byId(buildNodeExecutions(graphOf([], ["a"]), state, undefined, pending)).a
    ).toMatchObject({
      status: "pending",
      usage: 0,
      pendingEvent: { type: "form-response-a", timeout: "30 minutes" },
    });
  });

  it("reports a mixed workflow node by node", () => {
    const graph = graphOf(
      ["ok -> bad", "bad -> blocked"],
      ["waiting", "never"]
    );
    const state = emptyState({
      executedNodes: ["ok"],
      nodeOutputs: { ok: { out: 1 } },
      nodeErrors: { bad: "boom" },
      skippedNodes: ["blocked"],
    });
    const pending = new Map([["waiting", { type: "evt", timeout: "1 hour" }]]);

    const report = byId(buildNodeExecutions(graph, state, undefined, pending));

    expect(report.ok.status).toBe("completed");
    expect(report.bad.status).toBe("error");
    expect(report.blocked.status).toBe("skipped");
    expect(report.waiting.status).toBe("pending");
    expect(report.never.status).toBe("executing");
  });

  it("returns an empty report for an empty workflow", () => {
    expect(buildNodeExecutions(graphOf([]), emptyState())).toEqual([]);
  });

  it("does not mutate the state it reads", () => {
    const state = emptyState({
      executedNodes: ["a"],
      nodeOutputs: { a: { y: 1 } },
    });
    const snapshot = JSON.stringify(state);

    buildNodeExecutions(graphOf(["a -> b"]), state);

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
