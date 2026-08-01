/**
 * Execution state is where "what happened" turns into "what the user sees".
 *
 * The subtle part is skip classification: a node that didn't run because a
 * conditional branch went the other way is *expected*, while one that didn't
 * run because an upstream node blew up is a *failure* — and the two must never
 * be confused, because that distinction alone decides whether the whole run is
 * reported as completed or errored.
 */

import { describe, expect, it } from "vitest";

import { emptyState, workflowOf } from "./__test-stubs__/runtime-harness";
import { ExecutionGraph } from "./execution-graph";
import {
  analyzeUpstream,
  applyNodeResult,
  getExecutionStatus,
  getNodeType,
  inferSkipReason,
  isRuntimeValue,
} from "./execution-state";
import type { ExecutionState } from "./execution-types";
import { ExecutableNode } from "./node-types";

const graphOf = (edges: string[], extra: string[] = []) =>
  ExecutionGraph.build(workflowOf(edges, extra));

describe("applyNodeResult", () => {
  it("records a completed node's outputs, usage and inputs", () => {
    const state = emptyState();
    applyNodeResult(state, {
      nodeId: "a",
      status: "completed",
      inputs: { x: 1 },
      outputs: { y: 2 },
      usage: 5,
    });

    expect(state.executedNodes).toEqual(["a"]);
    expect(state.nodeOutputs.a).toEqual({ y: 2 });
    expect(state.nodeInputs.a).toEqual({ x: 1 });
    expect(state.nodeUsage.a).toBe(5);
  });

  it("records an error with the usage already burned", () => {
    const state = emptyState();
    applyNodeResult(state, {
      nodeId: "a",
      status: "error",
      error: "boom",
      usage: 3,
    });

    expect(state.nodeErrors.a).toBe("boom");
    expect(state.nodeUsage.a).toBe(3);
    expect(state.executedNodes).toEqual([]);
  });

  it("omits usage for an error that consumed nothing", () => {
    const state = emptyState();
    applyNodeResult(state, { nodeId: "a", status: "error", error: "boom" });
    expect(state.nodeUsage).toEqual({});
  });

  it("records a skip without outputs or usage", () => {
    const state = emptyState();
    applyNodeResult(state, {
      nodeId: "a",
      status: "skipped",
      outputs: null,
      usage: 0,
    });

    expect(state.skippedNodes).toEqual(["a"]);
    expect(state.nodeOutputs).toEqual({});
    expect(state.nodeUsage).toEqual({});
  });

  it("records only the inputs of a node that parked on an event", () => {
    const state = emptyState();
    applyNodeResult(state, {
      nodeId: "a",
      status: "pending",
      inputs: { x: 1 },
      eventType: "form-response",
      timeout: "30 minutes",
    });

    expect(state.nodeInputs.a).toEqual({ x: 1 });
    expect(state.executedNodes).toEqual([]);
    expect(state.skippedNodes).toEqual([]);
    expect(state.nodeErrors).toEqual({});
  });

  it("leaves inputs untouched when the result carries none", () => {
    const state = emptyState({ nodeInputs: { a: { x: 1 } } });
    applyNodeResult(state, {
      nodeId: "a",
      status: "error",
      error: "resolve failed",
    });

    expect(state.nodeInputs.a).toEqual({ x: 1 });
  });
});

describe("analyzeUpstream", () => {
  it("lets a node with no inbound edges run", () => {
    const analysis = analyzeUpstream(graphOf([], ["a"]), emptyState(), "a");
    expect(analysis.shouldSkip).toBe(false);
  });

  it("lets a node run while its single upstream produced the output", () => {
    const state = emptyState({
      executedNodes: ["a"],
      nodeOutputs: { a: { out: 1 } },
    });
    expect(analyzeUpstream(graphOf(["a -> b"]), state, "b").shouldSkip).toBe(
      false
    );
  });

  it("skips a node whose only upstream errored, blaming the failure", () => {
    const state = emptyState({ nodeErrors: { a: "boom" } });
    const analysis = analyzeUpstream(graphOf(["a -> b"]), state, "b");

    expect(analysis).toMatchObject({
      shouldSkip: true,
      reason: "upstream_failure",
      blockedBy: ["a"],
    });
  });

  it("skips a node whose upstream took the other branch", () => {
    // `a` ran but never populated `out`, which is how a conditional fork
    // signals the branch it did not take.
    const state = emptyState({
      executedNodes: ["a"],
      nodeOutputs: { a: { somethingElse: 1 } },
    });
    const analysis = analyzeUpstream(graphOf(["a:out -> b"]), state, "b");

    expect(analysis).toMatchObject({
      shouldSkip: true,
      reason: "conditional_branch",
      blockedBy: ["a"],
    });
  });

  it("runs a node when any single inbound edge still has data", () => {
    // One live edge is enough — a join node must not be skipped just because
    // one of its branches was pruned.
    const state = emptyState({
      executedNodes: ["a", "b"],
      nodeOutputs: { a: { out: 1 }, b: {} },
    });
    const analysis = analyzeUpstream(
      graphOf(["a:out -> c:x", "b:out -> c:y"]),
      state,
      "c"
    );

    expect(analysis.shouldSkip).toBe(false);
  });

  it("skips only when every inbound edge is blocked", () => {
    const state = emptyState({
      executedNodes: ["a", "b"],
      nodeOutputs: { a: {}, b: {} },
    });
    const analysis = analyzeUpstream(
      graphOf(["a:out -> c:x", "b:out -> c:y"]),
      state,
      "c"
    );

    expect(analysis.shouldSkip).toBe(true);
  });

  it("traces a skip chain back to the original failure", () => {
    // a errored -> b skipped -> c skipped. c must read as a failure, not as
    // expected branching, or the run would be reported as completed.
    const graph = graphOf(["a -> b", "b -> c"]);
    const state = emptyState({
      nodeErrors: { a: "boom" },
      skippedNodes: ["b"],
    });

    expect(analyzeUpstream(graph, state, "c")).toMatchObject({
      shouldSkip: true,
      reason: "upstream_failure",
      blockedBy: ["b"],
    });
  });

  it("propagates a conditional skip down the chain as conditional", () => {
    const graph = graphOf(["a:out -> b", "b -> c"]);
    const state = emptyState({
      executedNodes: ["a"],
      nodeOutputs: { a: {} },
      skippedNodes: ["b"],
    });

    expect(analyzeUpstream(graph, state, "c")).toMatchObject({
      reason: "conditional_branch",
      blockedBy: ["b"],
    });
  });

  it("prefers the failure when a node is blocked by both kinds at once", () => {
    const graph = graphOf(["a:out -> c:x", "b -> c:y"]);
    const state = emptyState({
      executedNodes: ["a"],
      nodeOutputs: { a: {} },
      nodeErrors: { b: "boom" },
    });

    expect(analyzeUpstream(graph, state, "c")).toMatchObject({
      reason: "upstream_failure",
      blockedBy: ["b"],
    });
  });

  it("falls back to failure when no blocker can be identified", () => {
    // Conservative default: an unexplained skip must not be waved through as
    // expected branching.
    const state = emptyState({ skippedNodes: ["a"] });
    expect(analyzeUpstream(graphOf([], ["a"]), state, "a")).toMatchObject({
      reason: "upstream_failure",
      blockedBy: [],
    });
  });

  it("counts a diamond's two paths independently", () => {
    const graph = graphOf([
      "root:out -> left",
      "root:other -> right",
      "left -> join:x",
      "right -> join:y",
    ]);
    const state = emptyState({
      executedNodes: ["root", "left"],
      nodeOutputs: { root: { out: 1 }, left: { out: 1 } },
      skippedNodes: ["right"],
    });

    expect(analyzeUpstream(graph, state, "join").shouldSkip).toBe(false);
  });
});

describe("inferSkipReason", () => {
  it("projects the analysis without the scheduling verdict", () => {
    const state = emptyState({ nodeErrors: { a: "boom" } });
    const reason = inferSkipReason(graphOf(["a -> b"]), state, "b");

    expect(reason).toEqual({ reason: "upstream_failure", blockedBy: ["a"] });
    expect("shouldSkip" in reason).toBe(false);
  });
});

describe("getExecutionStatus", () => {
  const graph = graphOf(["a -> b"]);

  it("reports executing while nodes remain unvisited", () => {
    expect(getExecutionStatus(graph, emptyState())).toBe("executing");
  });

  it("reports executing when only some nodes have settled", () => {
    const state = emptyState({ executedNodes: ["a"] });
    expect(getExecutionStatus(graph, state)).toBe("executing");
  });

  it("reports completed once every node succeeded", () => {
    const state = emptyState({ executedNodes: ["a", "b"] });
    expect(getExecutionStatus(graph, state)).toBe("completed");
  });

  it("reports error when any node failed", () => {
    const state = emptyState({
      executedNodes: ["a"],
      nodeErrors: { b: "boom" },
    });
    expect(getExecutionStatus(graph, state)).toBe("error");
  });

  it("reports completed when a skip was conditional", () => {
    const conditional = graphOf(["a:out -> b"]);
    const state = emptyState({
      executedNodes: ["a"],
      nodeOutputs: { a: {} },
      skippedNodes: ["b"],
    });

    expect(getExecutionStatus(conditional, state)).toBe("completed");
  });

  it("reports error when a skip traces back to a failure", () => {
    const state = emptyState({
      nodeErrors: { a: "boom" },
      skippedNodes: ["b"],
    });
    expect(getExecutionStatus(graph, state)).toBe("error");
  });

  it("reports completed for an empty workflow", () => {
    expect(getExecutionStatus(graphOf([]), emptyState())).toBe("completed");
  });

  it("counts a node that is both executed and errored as visited", () => {
    const state: ExecutionState = emptyState({
      executedNodes: ["a"],
      nodeErrors: { b: "boom" },
    });
    expect(getExecutionStatus(graph, state)).toBe("error");
  });
});

describe("isRuntimeValue", () => {
  it.each([
    ["string", "text"],
    ["empty string", ""],
    ["number", 42],
    ["zero", 0],
    ["boolean", false],
    ["plain object", { a: 1 }],
    ["empty object", {}],
    ["array", [1, 2]],
    ["object reference", { id: "o1", mimeType: "image/png" }],
  ])("accepts a %s", (_label, value) => {
    expect(isRuntimeValue(value)).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["function", () => {}],
    ["Date", new Date()],
    ["Uint8Array", new Uint8Array([1])],
    ["Map", new Map()],
  ])("rejects a %s", (_label, value) => {
    expect(isRuntimeValue(value)).toBe(false);
  });

  it("rejects class instances that would not survive serialization", () => {
    class Custom {
      value = 1;
    }
    expect(isRuntimeValue(new Custom())).toBe(false);
  });
});

describe("getNodeType", () => {
  class TypedNode extends ExecutableNode {
    static readonly nodeType = {
      id: "typed",
      name: "Typed",
      type: "typed",
      description: "",
      tags: [],
      icon: "x",
      inputs: [],
      outputs: [],
    } as never;

    async execute() {
      return this.createSuccessResult({});
    }
  }

  it("reads the static nodeType off an instance", () => {
    const node = new TypedNode({ id: "n" } as never);
    expect(getNodeType(node)).toMatchObject({ type: "typed" });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a primitive", "text"],
  ])("returns null for %s", (_label, value) => {
    expect(getNodeType(value)).toBeNull();
  });

  it("returns null for an object with no nodeType", () => {
    expect(getNodeType({})).toBeNull();
  });
});
