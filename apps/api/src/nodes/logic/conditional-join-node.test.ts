import { Node } from "@dafthunk/types";
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
        name: "a",
        type: "any",
        required: false,
      },
      {
        name: "b",
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
    inputs,
    env: {} as any,
  });

  it("should output 'a' when only 'a' is provided", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({
      a: "hello from a",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello from a");
  });

  it("should output 'b' when only 'b' is provided", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({
      b: "hello from b",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello from b");
  });

  it("should handle complex data types correctly", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const complexData = {
      message: "complex data",
      count: 42,
      items: [1, 2, 3],
    };
    const context = createNodeContext({
      a: complexData,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(complexData);
  });

  it("should error when both inputs are provided (violates exclusive join)", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({
      a: "hello from a",
      b: "hello from b",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("both 'a' and 'b' were provided");
    expect(result.error).toContain("exclusive join condition");
  });

  it("should error when no inputs are provided", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    const context = createNodeContext({});

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("neither 'a' nor 'b' was provided");
    expect(result.error).toContain("error in the workflow design");
  });

  it("should handle null and undefined values correctly", async () => {
    const node = new ConditionalJoinNode(createTestNode());
    // null is a valid value, undefined means input wasn't provided
    const contextWithNull = createNodeContext({
      a: null,
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
        a: value,
      });
      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(value);
    }
  });
});
