import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ExecutionGraph } from "./execution-graph";

function workflowOf(
  nodeIds: string[],
  edges: Array<[string, string]>,
  options: { sourceOutput?: string; targetInput?: string } = {}
): Workflow {
  return {
    id: "wf",
    name: "wf",
    trigger: "manual",
    nodes: nodeIds.map((id) => ({
      id,
      name: id,
      type: "test",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    })),
    edges: edges.map(([source, target]) => ({
      source,
      target,
      sourceOutput: options.sourceOutput ?? "out",
      targetInput: options.targetInput ?? "in",
    })),
  } as Workflow;
}

/** Position of each node id in the topological order. */
function positions(graph: ExecutionGraph): Record<string, number> {
  return Object.fromEntries(graph.nodeIds.map((id, index) => [id, index]));
}

describe("ExecutionGraph", () => {
  it("orders every node after its dependencies", () => {
    const graph = ExecutionGraph.build(
      workflowOf(
        ["d", "b", "a", "c"],
        [
          ["a", "b"],
          ["a", "c"],
          ["b", "d"],
          ["c", "d"],
        ]
      )
    );

    const at = positions(graph);
    expect(graph.nodeIds).toHaveLength(4);
    expect(at.a).toBeLessThan(at.b);
    expect(at.a).toBeLessThan(at.c);
    expect(at.b).toBeLessThan(at.d);
    expect(at.c).toBeLessThan(at.d);
  });

  it("includes isolated nodes", () => {
    const graph = ExecutionGraph.build(
      workflowOf(["a", "b", "lonely"], [["a", "b"]])
    );
    expect([...graph.nodeIds].sort()).toEqual(["a", "b", "lonely"]);
  });

  it("is deterministic, so replayed executions rebuild the same order", () => {
    const build = () =>
      ExecutionGraph.build(
        workflowOf(
          ["c", "a", "b"],
          [
            ["a", "c"],
            ["b", "c"],
          ]
        )
      ).nodeIds;
    expect(build()).toEqual(build());
  });

  it("rejects a cyclic graph rather than silently dropping nodes", () => {
    expect(() =>
      ExecutionGraph.build(
        workflowOf(
          ["a", "b"],
          [
            ["a", "b"],
            ["b", "a"],
          ]
        )
      )
    ).toThrow(/cycle/i);
  });

  it("counts parallel edges between the same pair as one dependency", () => {
    // Two edges a->b feeding different inputs must not double-count, or b would
    // never become schedulable.
    const workflow = workflowOf(["a", "b"], [["a", "b"]]);
    workflow.edges.push({
      source: "a",
      target: "b",
      sourceOutput: "second",
      targetInput: "other",
    });

    const graph = ExecutionGraph.build(workflow);
    expect(graph.nodeIds).toEqual(["a", "b"]);
    expect([...graph.dependencies("b")]).toEqual(["a"]);
    expect(graph.inboundEdges("b")).toHaveLength(2);
  });

  it("indexes nodes and inbound edges, and is empty for unknown ids", () => {
    const graph = ExecutionGraph.build(workflowOf(["a", "b"], [["a", "b"]]));

    expect(graph.node("a")?.id).toBe("a");
    expect(graph.node("nope")).toBeUndefined();
    expect(graph.inboundEdges("a")).toEqual([]);
    expect(graph.inboundEdges("b").map((e) => e.source)).toEqual(["a"]);
    expect([...graph.dependencies("nope")]).toEqual([]);
  });

  it("handles an empty workflow", () => {
    const graph = ExecutionGraph.build(workflowOf([], []));
    expect(graph.nodeIds).toEqual([]);
  });
});
