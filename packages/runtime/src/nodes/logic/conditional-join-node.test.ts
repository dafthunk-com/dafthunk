import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ConditionalJoinNode } from "./conditional-join-node";

describe("ConditionalJoinNode", () => {
  const createTestNode = (): Node => ({
    id: "test-conditional-join",
    name: "Test Conditional Join",
    type: "conditional-join",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "true",
        type: "any",
        required: false,
      },
      {
        name: "false",
        type: "any",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
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

  it("should output 'true' when only 'true' is provided", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({
      true: "hello from true",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello from true");
  });

  it("should output 'false' when only 'false' is provided", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({
      false: "hello from false",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello from false");
  });

  it("should handle complex data types correctly", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const complexData = {
      message: "complex data",
      count: 42,
      items: [1, 2, 3],
    };
    const context = createNodeContext({
      true: complexData,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(complexData);
  });

  it("should error when both inputs are provided (violates exclusive join)", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({
      true: "hello from true",
      false: "hello from false",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("both 'true' and 'false' were provided");
    expect(result.error).toContain("exclusive join condition");
  });

  it("should error when no inputs are provided", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({});

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("neither 'true' nor 'false' was provided");
    expect(result.error).toContain("error in the workflow design");
  });

  it("should handle null and undefined values correctly", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    // null is a valid value, undefined means input wasn't provided
    const contextWithNull = createNodeContext({
      true: null,
    });

    const result = await node.execute(contextWithNull);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(null);
  });

  it("should handle falsy values correctly", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    // Test various falsy values that are still valid inputs
    const falsyValues = [false, 0, "", null];
    for (const value of falsyValues) {
      const context = createNodeContext({
        true: value,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(value);
    }
  });
});
