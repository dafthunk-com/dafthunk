import { describe, it, expect } from "vitest";
import { Node } from "@dafthunk/types";

import { JoinXorNode } from "./join-xor-node";

describe("JoinXorNode", () => {
  const createTestNode = (): Node => ({
    id: "test-join-xor",
    name: "Test Join XOR",
    type: "join-xor",
    position: { x: 0, y: 0 },
    inputs: [
      {
        name: "valueA",
        type: "any",
        required: false,
      },
      {
        name: "valueB",
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
    inputs,
    env: {} as any,
  });

  it("should output valueA when only valueA is provided", async () => {
    const node = new JoinXorNode(createTestNode());
    const context = createNodeContext({
      valueA: "hello from A",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello from A");
  });

  it("should output valueB when only valueB is provided", async () => {
    const node = new JoinXorNode(createTestNode());
    const context = createNodeContext({
      valueB: "hello from B",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello from B");
  });

  it("should handle complex data types correctly", async () => {
    const node = new JoinXorNode(createTestNode());
    const complexData = { message: "complex data", count: 42, items: [1, 2, 3] };
    const context = createNodeContext({
      valueA: complexData,
    });

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(complexData);
  });

  it("should error when both inputs are provided (violates XOR)", async () => {
    const node = new JoinXorNode(createTestNode());
    const context = createNodeContext({
      valueA: "hello from A",
      valueB: "hello from B",
    });

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("both valueA and valueB were provided");
    expect(result.error).toContain("violates the XOR condition");
  });

  it("should error when no inputs are provided", async () => {
    const node = new JoinXorNode(createTestNode());
    const context = createNodeContext({});

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("neither valueA nor valueB was provided");
    expect(result.error).toContain("error in the workflow design");
  });

  it("should handle null and undefined values correctly", async () => {
    const node = new JoinXorNode(createTestNode());
    
    // null is a valid value, undefined means input wasn't provided
    const contextWithNull = createNodeContext({
      valueA: null,
    });

    const result = await node.execute(contextWithNull);

    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(null);
  });

  it("should handle falsy values correctly", async () => {
    const node = new JoinXorNode(createTestNode());
    
    // Test various falsy values that are still valid inputs
    const falsyValues = [false, 0, "", null];
    
    for (const value of falsyValues) {
      const context = createNodeContext({
        valueA: value,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(value);
    }
  });
}); 