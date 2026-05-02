import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { SwitchJoinNode } from "./switch-join-node";

describe("SwitchJoinNode", () => {
  const createTestNode = (caseCount = 2): Node => ({
    id: "test-switch-join",
    name: "Test Switch Join",
    type: "switch-join",
    position: { x: 0, y: 0 },
    inputs: [
      { name: "default", type: "any" },
      ...Array.from({ length: caseCount }, (_, i) => ({
        name: `case_${i + 1}`,
        type: "any" as const,
      })),
    ],
    outputs: [{ name: "result", type: "any" }],
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

  it("emits the value from a single active case branch", async () => {
    const node = new SwitchJoinNode(createTestNode(3));
    const context = createNodeContext({
      case_1: undefined,
      case_2: "from b",
      case_3: undefined,
      default: undefined,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("from b");
  });

  it("emits the value from the default branch", async () => {
    const node = new SwitchJoinNode(createTestNode(2));
    const context = createNodeContext({
      case_1: undefined,
      case_2: undefined,
      default: "fallback",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("fallback");
  });

  it("preserves complex objects when joining", async () => {
    const node = new SwitchJoinNode(createTestNode(2));
    const payload = { id: 7, items: [1, 2, 3] };
    const context = createNodeContext({
      case_1: payload,
      case_2: undefined,
      default: undefined,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(payload);
  });

  it("errors when no input is provided", async () => {
    const node = new SwitchJoinNode(createTestNode(2));
    const context = createNodeContext({
      case_1: undefined,
      case_2: undefined,
      default: undefined,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("none was provided");
  });

  it("errors when multiple inputs are provided", async () => {
    const node = new SwitchJoinNode(createTestNode(2));
    const context = createNodeContext({
      case_1: "a",
      case_2: "b",
      default: undefined,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("multiple were provided");
  });
});
