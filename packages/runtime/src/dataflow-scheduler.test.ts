/**
 * The scheduler's whole reason to exist is that a node parked on an external
 * event — a human filling in a form, an agent still thinking — must hold back
 * only its own descendants. A level-synchronised scheduler would stall the
 * entire workflow behind it. Most of what follows is about proving that
 * independence, and that nothing starts before its dependencies have settled.
 */

import { describe, expect, it } from "vitest";

import { emptyState, workflowOf } from "./__test-stubs__/runtime-harness";
import { type DataflowHooks, executeDataflow } from "./dataflow-scheduler";
import { ExecutionGraph } from "./execution-graph";
import type { ExecutionState, NodeExecutionResult } from "./execution-types";

const graphOf = (edges: string[], extra: string[] = []) =>
  ExecutionGraph.build(workflowOf(edges, extra));

const completed = (nodeId: string, outputs = {}): NodeExecutionResult => ({
  nodeId,
  status: "completed",
  outputs,
  usage: 1,
});

const failed = (nodeId: string): NodeExecutionResult => ({
  nodeId,
  status: "error",
  error: "boom",
});

const parked = (nodeId: string): NodeExecutionResult => ({
  nodeId,
  status: "pending",
  eventType: `form-response-${nodeId}`,
  timeout: "30 minutes",
});

/** A promise plus the handle to settle it from the test body. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * Drives executeDataflow with per-node behaviour, recording the order in which
 * nodes were started and progress was reported.
 */
function harness(
  behaviour: Record<
    string,
    NodeExecutionResult | (() => Promise<NodeExecutionResult>)
  > = {}
) {
  const started: string[] = [];
  const progressSnapshots: string[][] = [];
  const resolvedPending: string[] = [];
  const state = emptyState();

  const hooks: DataflowHooks = {
    runNode: async (nodeId) => {
      started.push(nodeId);
      const behave = behaviour[nodeId];
      if (typeof behave === "function") return behave();
      return behave ?? completed(nodeId, { out: nodeId });
    },
    resolvePending: async (pending) => {
      resolvedPending.push(pending.nodeId);
      return completed(pending.nodeId, { out: `${pending.nodeId}-resolved` });
    },
    onProgress: async (pendingNodes) => {
      progressSnapshots.push([...pendingNodes.keys()]);
    },
  };

  return { started, progressSnapshots, resolvedPending, state, hooks };
}

describe("dependency ordering", () => {
  it("does not start a node before its dependency settles", async () => {
    const h = harness();
    await executeDataflow(graphOf(["a -> b", "b -> c"]), h.state, h.hooks);

    expect(h.started).toEqual(["a", "b", "c"]);
  });

  it("starts every root node immediately", async () => {
    const h = harness();
    await executeDataflow(graphOf([], ["a", "b", "c"]), h.state, h.hooks);

    expect(h.started.sort()).toEqual(["a", "b", "c"]);
  });

  it("waits for all of a join's dependencies", async () => {
    const h = harness();
    await executeDataflow(
      graphOf(["a -> join:x", "b -> join:y"]),
      h.state,
      h.hooks
    );

    expect(h.started.indexOf("join")).toBe(2);
  });

  it("starts each node exactly once", async () => {
    const h = harness();
    // Two edges into the same node must not schedule it twice.
    await executeDataflow(
      graphOf(["a:one -> b:x", "a:two -> b:y"]),
      h.state,
      h.hooks
    );

    expect(h.started).toEqual(["a", "b"]);
  });

  it("completes without work for an empty graph", async () => {
    const h = harness();
    await executeDataflow(graphOf([]), h.state, h.hooks);

    expect(h.started).toEqual([]);
    expect(h.progressSnapshots).toEqual([]);
  });
});

describe("state accumulation", () => {
  it("applies each result as its node settles", async () => {
    const h = harness({
      a: completed("a", { out: 1 }),
      b: failed("b"),
    });
    await executeDataflow(graphOf([], ["a", "b"]), h.state, h.hooks);

    expect(h.state.executedNodes).toEqual(["a"]);
    expect(h.state.nodeOutputs.a).toEqual({ out: 1 });
    expect(h.state.nodeErrors.b).toBe("boom");
  });

  it("keeps scheduling downstream nodes after an upstream failure", async () => {
    // The scheduler does not decide skips — it settles the failure and lets the
    // executor decide what the dependent node should report.
    const h = harness({ a: failed("a") });
    await executeDataflow(graphOf(["a -> b"]), h.state, h.hooks);

    expect(h.started).toEqual(["a", "b"]);
  });

  it("reports progress once per settled node", async () => {
    const h = harness();
    await executeDataflow(graphOf(["a -> b"]), h.state, h.hooks);

    expect(h.progressSnapshots).toHaveLength(2);
  });
});

describe("parked nodes", () => {
  it("resolves a parked node through the pending hook", async () => {
    const h = harness({ a: parked("a") });
    await executeDataflow(graphOf([], ["a"]), h.state, h.hooks);

    expect(h.resolvedPending).toEqual(["a"]);
    expect(h.state.nodeOutputs.a).toEqual({ out: "a-resolved" });
    expect(h.state.executedNodes).toEqual(["a"]);
  });

  it("surfaces the node as pending while it waits", async () => {
    const h = harness({ a: parked("a") });
    await executeDataflow(graphOf([], ["a"]), h.state, h.hooks);

    // First snapshot is taken the moment the node parks; by the last one the
    // event has arrived and it is no longer pending.
    expect(h.progressSnapshots[0]).toEqual(["a"]);
    expect(h.progressSnapshots.at(-1)).toEqual([]);
  });

  it("records a parked node's inputs before its outputs exist", async () => {
    const h = harness({
      a: { ...parked("a"), inputs: { seed: 7 } } as NodeExecutionResult,
    });
    await executeDataflow(graphOf([], ["a"]), h.state, h.hooks);

    expect(h.state.nodeInputs.a).toEqual({ seed: 7 });
  });

  it("lets an unrelated branch finish while a node stays parked", async () => {
    // The point of dataflow scheduling: `slow` is parked indefinitely, but the
    // independent b -> c chain must run to completion regardless.
    const gate = deferred<NodeExecutionResult>();
    const h = harness({ slow: parked("slow") });

    const hooks: DataflowHooks = {
      ...h.hooks,
      resolvePending: () => gate.promise,
    };

    const graph = graphOf(["b -> c"], ["slow"]);
    const run = executeDataflow(graph, h.state, hooks);

    // Let the independent branch drain while `slow` is still waiting.
    await new Promise((r) => setTimeout(r, 0));
    expect(h.state.executedNodes).toEqual(expect.arrayContaining(["b", "c"]));

    gate.resolve(completed("slow"));
    await run;

    expect(h.state.executedNodes).toContain("slow");
  });

  it("still blocks a parked node's own descendants", async () => {
    const gate = deferred<NodeExecutionResult>();
    const h = harness({ a: parked("a") });

    const hooks: DataflowHooks = {
      ...h.hooks,
      resolvePending: () => gate.promise,
    };

    const run = executeDataflow(graphOf(["a -> b"]), h.state, hooks);
    await new Promise((r) => setTimeout(r, 0));

    expect(h.started).toEqual(["a"]);

    gate.resolve(completed("a"));
    await run;

    expect(h.started).toEqual(["a", "b"]);
  });

  it("handles a parked node that resolves to an error", async () => {
    const h = harness({ a: parked("a") });
    const hooks: DataflowHooks = {
      ...h.hooks,
      resolvePending: async (pending) => failed(pending.nodeId),
    };

    await executeDataflow(graphOf([], ["a"]), h.state, hooks);

    expect(h.state.nodeErrors.a).toBe("boom");
    expect(h.state.executedNodes).toEqual([]);
  });
});

describe("concurrency", () => {
  it("runs independent branches at the same time rather than in sequence", async () => {
    const first = deferred<NodeExecutionResult>();
    const second = deferred<NodeExecutionResult>();
    const state: ExecutionState = emptyState();
    const started: string[] = [];

    const run = executeDataflow(graphOf([], ["a", "b"]), state, {
      runNode: async (nodeId) => {
        started.push(nodeId);
        return nodeId === "a" ? first.promise : second.promise;
      },
      resolvePending: async (p) => completed(p.nodeId),
      onProgress: async () => {},
    });

    await new Promise((r) => setTimeout(r, 0));
    // Both are in flight before either has produced a result.
    expect(started).toEqual(["a", "b"]);

    // Settle out of start order to confirm results are matched by node, not
    // by the order work was issued.
    second.resolve(completed("b", { out: "b" }));
    first.resolve(completed("a", { out: "a" }));
    await run;

    expect(state.nodeOutputs).toEqual({ a: { out: "a" }, b: { out: "b" } });
  });

  it("settles a wide fan-out completely", async () => {
    const leaves = Array.from({ length: 25 }, (_, i) => `leaf-${i}`);
    const h = harness();
    const graph = graphOf(leaves.map((leaf) => `root -> ${leaf}`));

    await executeDataflow(graph, h.state, h.hooks);

    expect(h.state.executedNodes).toHaveLength(26);
  });

  it("propagates a hook failure instead of hanging", async () => {
    const h = harness();
    const hooks: DataflowHooks = {
      ...h.hooks,
      runNode: async () => {
        throw new Error("executor exploded");
      },
    };

    await expect(
      executeDataflow(graphOf([], ["a"]), h.state, hooks)
    ).rejects.toThrow(/executor exploded/);
  });
});
