import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ConditionalForkNode } from "./conditional-fork-node";

describe("ConditionalForkNode", () => {
  const createTestNode = (): Node => ({
    id: "test-conditional-fork",
    name: "Test Conditional Fork",
    type: "conditional-fork",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "condition",
        type: "boolean",
        required: true,
      },
      {
        name: "value",
        type: "any",
        required: true,
      },
    ],
    outputs: [
      {
        name: "true",
        type: "any",
      },
      {
        name: "false",
        type: "any",
      },
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

  it("should output to 'true' branch when condition is true", async () => {
    const node = new ConditionalForkNode(createTestNode());
    const context = createNodeContext({
      condition: true,
      value: "hello from true",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.true).toBe("hello from true");
    expect(result.outputs?.false).toBeUndefined();
  });

  it("should output to 'false' branch when condition is false", async () => {
    const node = new ConditionalForkNode(createTestNode());
    const context = createNodeContext({
      condition: false,
      value: "hello from false",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.false).toBe("hello from false");
    expect(result.outputs?.true).toBeUndefined();
  });

  it("should handle complex data types correctly", async () => {
    const node = new ConditionalForkNode(createTestNode());
    const complexData = {
      message: "complex data",
      count: 42,
      items: [1, 2, 3],
    };
    const context = createNodeContext({
      condition: true,
      value: complexData,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.true).toEqual(complexData);
    expect(result.outputs?.false).toBeUndefined();
  });

  it("should error when condition is not a boolean", async () => {
    const node = new ConditionalForkNode(createTestNode());
    const context = createNodeContext({
      condition: "not a boolean",
      value: "some value",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
  });

  it("should error when value is undefined", async () => {
    const node = new ConditionalForkNode(createTestNode());
    const context = createNodeContext({
      condition: true,
      value: undefined,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Value input is required.");
  });
});
