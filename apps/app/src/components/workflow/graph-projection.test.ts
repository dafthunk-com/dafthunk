import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { describe, expect, it } from "vitest";

import {
  mergeRemoteNodes,
  serializeEdges,
  serializeNodes,
} from "./graph-projection";
import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

const createObjectUrl = () => "blob:test";

function node(
  overrides: Partial<WorkflowNodeType> & { id?: string } = {}
): ReactFlowNode<WorkflowNodeType> {
  const { id = "n1", ...data } = overrides;
  return {
    id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      name: "Node",
      inputs: [{ id: "in", name: "in", type: "string" }],
      outputs: [{ id: "out", name: "out", type: "string" }],
      executionState: "idle",
      nodeType: "text",
      ...data,
    },
  };
}

function edge(
  overrides: Partial<ReactFlowEdge<WorkflowEdgeType>> = {}
): ReactFlowEdge<WorkflowEdgeType> {
  return {
    id: "e1",
    source: "n1",
    target: "n2",
    sourceHandle: "out",
    targetHandle: "in",
    type: "workflowEdge",
    data: { isValid: true },
    ...overrides,
  };
}

describe("serializeNodes", () => {
  it("ignores execution state, errors and output values", () => {
    const idle = node();
    const executed = node({
      executionState: "completed",
      error: "boom",
      outputs: [{ id: "out", name: "out", type: "string", value: "result" }],
    });

    expect(serializeNodes([executed])).toBe(serializeNodes([idle]));
  });

  it("ignores the injected createObjectUrl callback", () => {
    expect(serializeNodes([node({ createObjectUrl })])).toBe(
      serializeNodes([node()])
    );
  });

  it("detects a changed input value", () => {
    const withValue = node({
      inputs: [{ id: "in", name: "in", type: "string", value: "hello" }],
    });

    expect(serializeNodes([withValue])).not.toBe(serializeNodes([node()]));
  });

  it("detects a moved node", () => {
    const moved = { ...node(), position: { x: 10, y: 0 } };
    expect(serializeNodes([moved])).not.toBe(serializeNodes([node()]));
  });
});

describe("serializeEdges", () => {
  it("ignores selection and active highlighting", () => {
    const active = edge({
      selected: true,
      data: { isValid: true, isActive: true },
    });
    expect(serializeEdges([active])).toBe(serializeEdges([edge()]));
  });

  it("detects a rewired edge", () => {
    expect(serializeEdges([edge({ target: "n3" })])).not.toBe(
      serializeEdges([edge()])
    );
  });
});

describe("mergeRemoteNodes", () => {
  it("keeps execution results when the server pushes an idle graph", () => {
    const local = node({
      executionState: "completed",
      error: "previous failure",
      outputs: [{ id: "out", name: "out", type: "string", value: "result" }],
    });
    const remote = node();

    const [merged] = mergeRemoteNodes([remote], [local], createObjectUrl);

    expect(merged.data.executionState).toBe("completed");
    expect(merged.data.error).toBe("previous failure");
    expect(merged.data.outputs[0].value).toBe("result");
  });

  it("takes structural changes from the server", () => {
    const local = node({ name: "Old name" });
    const remote = {
      ...node({ name: "New name" }),
      position: { x: 99, y: 42 },
    };

    const [merged] = mergeRemoteNodes([remote], [local], createObjectUrl);

    expect(merged.data.name).toBe("New name");
    expect(merged.position).toEqual({ x: 99, y: 42 });
  });

  it("preserves selection and an in-flight drag position", () => {
    const local = { ...node(), selected: true, dragging: true };
    local.position = { x: 5, y: 5 };
    const remote = { ...node(), position: { x: 0, y: 0 } };

    const [merged] = mergeRemoteNodes([remote], [local], createObjectUrl);

    expect(merged.selected).toBe(true);
    expect(merged.position).toEqual({ x: 5, y: 5 });
  });

  it("snaps to the server position when not dragging", () => {
    const local = { ...node(), position: { x: 5, y: 5 } };
    const remote = { ...node(), position: { x: 0, y: 0 } };

    const [merged] = mergeRemoteNodes([remote], [local], createObjectUrl);

    expect(merged.position).toEqual({ x: 0, y: 0 });
  });

  it("injects createObjectUrl into nodes it has not seen before", () => {
    const [merged] = mergeRemoteNodes(
      [node({ id: "new" })],
      [],
      createObjectUrl
    );
    expect(merged.data.createObjectUrl).toBe(createObjectUrl);
  });

  it("drops nodes the server no longer has", () => {
    const merged = mergeRemoteNodes(
      [node({ id: "a" })],
      [node({ id: "a" }), node({ id: "b" })],
      createObjectUrl
    );

    expect(merged.map((n) => n.id)).toEqual(["a"]);
  });

  it("does not carry a stale value onto a renamed output", () => {
    const local = node({
      outputs: [{ id: "old", name: "old", type: "string", value: "stale" }],
    });
    const remote = node({
      outputs: [{ id: "new", name: "new", type: "string" }],
    });

    const [merged] = mergeRemoteNodes([remote], [local], createObjectUrl);

    expect(merged.data.outputs[0].value).toBeUndefined();
  });
});
