import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";

import { applyValues, captureValues, countValues } from "./example-snapshot";
import type {
  WorkflowEdgeType,
  WorkflowNodeType,
  WorkflowParameter,
} from "./workflow-types";

/**
 * The editor's parameter adaptation sets `id` to the backend parameter name, so
 * these fixtures do the same — snapshots are keyed on that id.
 */
function param(
  name: string,
  type: string,
  extra: Partial<WorkflowParameter> = {}
): WorkflowParameter {
  return { id: name, name, type, ...extra } as WorkflowParameter;
}

function node(
  id: string,
  nodeType: string,
  inputs: WorkflowParameter[]
): Node<WorkflowNodeType> {
  return {
    id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      name: id,
      nodeType,
      inputs,
      outputs: [],
      executionState: "idle",
    },
  } as Node<WorkflowNodeType>;
}

function edge(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): Edge<WorkflowEdgeType> {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle,
    targetHandle,
  } as Edge<WorkflowEdgeType>;
}

describe("captureValues", () => {
  it("captures a hidden value that the node's widget edits", () => {
    // text-input hides `value` because its widget renders it inline. This is the
    // case a naive `!hidden` filter drops, which left examples empty.
    const nodes = [
      node("text", "text-input", [
        param("value", "string", { value: "hello", hidden: true }),
      ]),
    ];

    expect(captureValues(nodes, [])).toEqual({ text: { value: "hello" } });
  });

  it("captures a visible unconnected value", () => {
    const nodes = [
      node("tpl", "var-string-template", [
        param("template", "string", { value: "Hi ${var_1}" }),
      ]),
    ];

    expect(captureValues(nodes, [])).toEqual({
      tpl: { template: "Hi ${var_1}" },
    });
  });

  it("skips a connected input, whose literal would be inert", () => {
    const nodes = [
      node("a", "text-input", [
        param("value", "string", { value: "x", hidden: true }),
      ]),
      node("b", "output-text", [param("value", "string", { value: "stale" })]),
    ];

    const captured = captureValues(nodes, [edge("a", "value", "b", "value")]);

    expect(captured).toEqual({ a: { value: "x" } });
  });

  it("skips credential and resource types", () => {
    const nodes = [
      node("slack", "send-slack-message", [
        param("integrationId", "integration", { value: "i-1" }),
        param("text", "string", { value: "Hello" }),
      ]),
    ];

    expect(captureValues(nodes, [])).toEqual({ slack: { text: "Hello" } });
  });

  it("skips a hidden input no widget owns", () => {
    const nodes = [
      node("mystery", "some-node-without-a-widget", [
        param("secretish", "string", { value: "x", hidden: true }),
      ]),
    ];

    expect(captureValues(nodes, [])).toEqual({});
  });

  it("skips inputs with no value set", () => {
    const nodes = [node("text", "text-input", [param("value", "string")])];

    expect(captureValues(nodes, [])).toEqual({});
  });
});

describe("applyValues", () => {
  it("writes a captured value back onto the node", () => {
    const nodes = [
      node("text", "text-input", [
        param("value", "string", { value: "old", hidden: true }),
      ]),
    ];
    const updateNodeData = vi.fn();

    const applied = applyValues(
      { text: { value: "new" } },
      nodes,
      updateNodeData
    );

    expect(applied).toBe(1);
    expect(updateNodeData).toHaveBeenCalledTimes(1);

    // The updater is a function, so run it to see what it produces.
    const [nodeId, updater] = updateNodeData.mock.calls[0];
    expect(nodeId).toBe("text");
    const result = updater(nodes[0].data);
    expect(result.inputs?.[0].value).toBe("new");
  });

  it("round-trips: capture from one graph, apply onto another", () => {
    const source = [
      node("text", "text-input", [
        param("value", "string", { value: "captured", hidden: true }),
      ]),
    ];
    const target = [
      node("text", "text-input", [
        param("value", "string", { value: "different", hidden: true }),
      ]),
    ];

    const snapshot = captureValues(source, []);
    expect(countValues(snapshot)).toBe(1);

    const updateNodeData = vi.fn();
    expect(applyValues(snapshot, target, updateNodeData)).toBe(1);

    const updater = updateNodeData.mock.calls[0][1];
    expect(updater(target[0].data).inputs?.[0].value).toBe("captured");
  });

  it("skips a node the graph no longer has", () => {
    const updateNodeData = vi.fn();

    const applied = applyValues(
      { ghost: { value: "x" } },
      [node("text", "text-input", [param("value", "string")])],
      updateNodeData
    );

    expect(applied).toBe(0);
    expect(updateNodeData).not.toHaveBeenCalled();
  });

  it("skips an input the node no longer has", () => {
    const updateNodeData = vi.fn();

    const applied = applyValues(
      { text: { gone: "x" } },
      [node("text", "text-input", [param("value", "string")])],
      updateNodeData
    );

    expect(applied).toBe(0);
    expect(updateNodeData).not.toHaveBeenCalled();
  });

  it("leaves other inputs on the node untouched", () => {
    const nodes = [
      node("tpl", "var-string-template", [
        param("template", "string", { value: "keep" }),
        param("var_1", "string", { value: "old" }),
      ]),
    ];
    const updateNodeData = vi.fn();

    applyValues({ tpl: { var_1: "new" } }, nodes, updateNodeData);

    const updater = updateNodeData.mock.calls[0][1];
    const inputs = updater(nodes[0].data).inputs;
    expect(inputs?.find((i) => i.id === "template")?.value).toBe("keep");
    expect(inputs?.find((i) => i.id === "var_1")?.value).toBe("new");
  });
});
