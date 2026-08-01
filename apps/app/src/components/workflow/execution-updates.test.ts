import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { describe, expect, it } from "vitest";

import {
  applyExecutionUpdates,
  updateEdgesForExecution,
} from "./use-graph-operations";
import { toNodeExecutionUpdates } from "./use-workflow-execution-state";
import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

function node(
  id: string,
  data: Partial<WorkflowNodeType> = {}
): ReactFlowNode<WorkflowNodeType> {
  return {
    id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      name: id,
      inputs: [],
      outputs: [{ id: "out", name: "out", type: "string" }],
      executionState: "idle",
      nodeType: "text",
      ...data,
    },
  };
}

function edge(
  id: string,
  source: string,
  target: string
): ReactFlowEdge<WorkflowEdgeType> {
  return {
    id,
    source,
    target,
    sourceHandle: "out",
    targetHandle: "in",
    type: "workflowEdge",
    data: {},
  };
}

describe("applyExecutionUpdates", () => {
  it("applies a whole frame in one pass", () => {
    const nodes = [node("a"), node("b"), node("c")];

    const result = applyExecutionUpdates(nodes, [
      { nodeId: "a", state: "completed" },
      { nodeId: "c", state: "error", error: "boom" },
    ]);

    expect(result[0].data.executionState).toBe("completed");
    expect(result[1].data.executionState).toBe("idle");
    expect(result[2].data.executionState).toBe("error");
    expect(result[2].data.error).toBe("boom");
  });

  it("leaves untouched nodes referentially identical", () => {
    const nodes = [node("a"), node("b")];
    const result = applyExecutionUpdates(nodes, [
      { nodeId: "a", state: "executing" },
    ]);

    expect(result[1]).toBe(nodes[1]);
    expect(result[0]).not.toBe(nodes[0]);
  });

  it("returns the same array for an empty batch", () => {
    const nodes = [node("a")];
    expect(applyExecutionUpdates(nodes, [])).toBe(nodes);
  });

  it("clears a stale error when a node re-enters a non-error state", () => {
    const nodes = [node("a", { executionState: "error", error: "old" })];
    const [result] = applyExecutionUpdates(nodes, [
      { nodeId: "a", state: "executing" },
    ]);

    expect(result.data.error).toBeNull();
  });

  it("keeps the existing error when the new state is also error", () => {
    const nodes = [node("a", { executionState: "error", error: "old" })];
    const [result] = applyExecutionUpdates(nodes, [
      { nodeId: "a", state: "error" },
    ]);

    expect(result.data.error).toBe("old");
  });

  it("maps output values by id and by name", () => {
    const nodes = [
      node("a", {
        outputs: [
          { id: "byId", name: "byId", type: "string" },
          { id: "other", name: "byName", type: "string" },
        ],
      }),
    ];

    const [result] = applyExecutionUpdates(nodes, [
      { nodeId: "a", outputs: { byId: "one", byName: "two" } },
    ]);

    expect(result.data.outputs[0].value).toBe("one");
    expect(result.data.outputs[1].value).toBe("two");
  });

  it("ignores updates for nodes that are not in the graph", () => {
    const nodes = [node("a")];
    const result = applyExecutionUpdates(nodes, [
      { nodeId: "ghost", state: "completed" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].data.executionState).toBe("idle");
  });
});

describe("updateEdgesForExecution", () => {
  it("activates edges touching an executing node", () => {
    const nodes = [node("a", { executionState: "executing" }), node("b")];
    const edges = [edge("e1", "a", "b"), edge("e2", "b", "c")];

    const result = updateEdgesForExecution(edges, nodes);

    expect(result[0].data?.isActive).toBe(true);
    // Already inactive, so left untouched rather than rewritten to `false`.
    expect(result[1]).toBe(edges[1]);
    expect(result[1].data?.isActive).toBeFalsy();
  });

  it("clears highlighting once nothing is executing", () => {
    const nodes = [node("a", { executionState: "completed" })];
    const edges = [{ ...edge("e1", "a", "b"), data: { isActive: true } }];

    const result = updateEdgesForExecution(edges, nodes);

    expect(result[0].data?.isActive).toBe(false);
  });

  it("returns the same array when nothing changed, so setState bails out", () => {
    const nodes = [node("a")];
    const edges = [edge("e1", "a", "b")];

    expect(updateEdgesForExecution(edges, nodes)).toBe(edges);
  });
});

describe("toNodeExecutionUpdates", () => {
  const nodes = [node("a"), node("b")];

  it("promotes an idle node that carries output to completed", () => {
    const [update] = toNodeExecutionUpdates(
      {
        status: "completed",
        nodeExecutions: [
          { nodeId: "a", status: "idle", outputs: { out: "value" } },
        ],
      },
      nodes
    );

    expect(update.state).toBe("completed");
  });

  it("leaves a genuinely idle node alone", () => {
    const [update] = toNodeExecutionUpdates(
      {
        status: "idle",
        nodeExecutions: [{ nodeId: "a", status: "idle", outputs: {} }],
      },
      nodes
    );

    expect(update.state).toBe("idle");
  });

  it("drops executions for nodes no longer in the graph", () => {
    const updates = toNodeExecutionUpdates(
      {
        status: "completed",
        nodeExecutions: [
          { nodeId: "a", status: "completed" },
          { nodeId: "deleted", status: "completed" },
        ],
      },
      nodes
    );

    expect(updates.map((u) => u.nodeId)).toEqual(["a"]);
  });
});
