import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { SwitchForkNode } from "./switch-fork-node";

describe("SwitchForkNode", () => {
  const createTestNode = (caseCount = 2): Node => ({
    id: "test-switch-fork",
    name: "Test Switch Fork",
    type: "switch-fork",
    position: { x: 0, y: 0 },
    inputs: [
      { name: "selector", type: "string", required: true },
      { name: "value", type: "any", required: true },
      ...Array.from({ length: caseCount }, (_, i) => ({
        name: `case_${i + 1}`,
        type: "string" as const,
      })),
    ],
    outputs: [
      { name: "default", type: "any" },
      ...Array.from({ length: caseCount }, (_, i) => ({
        name: `case_${i + 1}`,
        type: "any" as const,
      })),
    ],
  });

  const createNodeContext = (inputs: Record<string, unknown>) => ({
    nodeId: "test-node-id",
    workflowId: "test-workflow-id",
    organizationId: "test-organization-id",
    mode: "dev" as const,
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  it("routes value to the matching case", async () => {
    const node = new SwitchForkNode(createTestNode(3));
    const context = createNodeContext({
      selector: "b",
      value: { payload: "anything" },
      case_1: "a",
      case_2: "b",
      case_3: "c",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.case_2).toEqual({ payload: "anything" });
    expect(result.outputs?.case_1).toBeUndefined();
    expect(result.outputs?.case_3).toBeUndefined();
    expect(result.outputs?.default).toBeUndefined();
  });

  it("emits the first matching case when duplicates exist", async () => {
    const node = new SwitchForkNode(createTestNode(3));
    const context = createNodeContext({
      selector: "x",
      value: 1,
      case_1: "x",
      case_2: "x",
      case_3: "y",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.case_1).toBe(1);
    expect(result.outputs?.case_2).toBeUndefined();
  });

  it("falls through to default when no case matches", async () => {
    const node = new SwitchForkNode(createTestNode(2));
    const context = createNodeContext({
      selector: "z",
      value: "payload",
      case_1: "a",
      case_2: "b",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.default).toBe("payload");
    expect(result.outputs?.case_1).toBeUndefined();
    expect(result.outputs?.case_2).toBeUndefined();
  });

  it("uses strict equality (no string coercion across types)", async () => {
    const node = new SwitchForkNode(createTestNode(2));
    const context = createNodeContext({
      selector: "42",
      value: "payload",
      case_1: "10",
      case_2: "42",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.case_2).toBe("payload");
  });

  it("errors when selector is not a string", async () => {
    const node = new SwitchForkNode(createTestNode(2));
    const context = createNodeContext({
      selector: 42,
      value: "payload",
      case_1: "10",
      case_2: "42",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Selector must be a string.");
  });

  it("errors when value is undefined", async () => {
    const node = new SwitchForkNode(createTestNode(2));
    const context = createNodeContext({
      selector: "a",
      value: undefined,
      case_1: "a",
      case_2: "b",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Value input is required.");
  });

  it("ignores undefined case keys and routes to default", async () => {
    const node = new SwitchForkNode(createTestNode(3));
    const context = createNodeContext({
      selector: "c",
      value: "payload",
      case_1: undefined,
      case_2: undefined,
      case_3: "c",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.case_3).toBe("payload");
  });
});
