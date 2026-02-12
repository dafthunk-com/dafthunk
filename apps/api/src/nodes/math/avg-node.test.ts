import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { AvgNode } from "./avg-node";

describe("AvgNode", () => {
  it("should return single number", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: 42,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(42);
  });

  it("should calculate average from multiple numbers", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, 2, 3, 4, 5],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(3); // (1+2+3+4+5)/5 = 3
  });

  it("should handle decimal numbers", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1.5, 2.5, 3.5],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(2.5); // (1.5+2.5+3.5)/3 = 2.5
  });

  it("should handle negative numbers", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [-10, -5, -15],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(-10); // (-10-5-15)/3 = -10
  });

  it("should handle mixed positive and negative numbers", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [-5, 10, -3, 7, -1],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(1.6); // (-5+10-3+7-1)/5 = 1.6
  });

  it("should handle duplicate values", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [5, 5, 5, 5],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(5); // (5+5+5+5)/4 = 5
  });

  it("should handle zero values", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [0, 5, -10, 0],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(-1.25); // (0+5-10+0)/4 = -1.25
  });

  it("should handle all zero values", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [0, 0, 0],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(0); // (0+0+0)/3 = 0
  });

  it("should return error for empty array", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Cannot calculate average of empty array");
  });

  it("should return error for missing input", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No number inputs provided");
  });

  it("should return error for invalid input type in array", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, "not-a-number", 3],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Invalid input at position 1: expected number, got string"
    );
  });

  it("should handle string numbers by converting them", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: ["1", "2", "3"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(2); // (1+2+3)/3 = 2
  });

  it("should handle large array of numbers", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    // Create an array of numbers 1 to 100
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

    const context = {
      nodeId,
      inputs: {
        numbers,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(50.5); // Average of 1 to 100 is 50.5
  });

  it("should handle two numbers", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [10, 20],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(15); // (10+20)/2 = 15
  });

  it("should handle precision correctly", async () => {
    const nodeId = "avg";
    const node = new AvgNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1.1, 2.2, 3.3],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    // Use toBeCloseTo for floating point comparison to handle precision issues
    expect(result.outputs?.result).toBeCloseTo(2.2, 10); // (1.1+2.2+3.3)/3 = 2.2
  });
});
