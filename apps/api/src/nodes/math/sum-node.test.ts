import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SumNode } from "./sum-node";

describe("SumNode", () => {
  it("should sum single number", async () => {
    const nodeId = "sum";
    const node = new SumNode({
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

  it("should sum multiple numbers from array", async () => {
    const nodeId = "sum";
    const node = new SumNode({
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
    expect(result.outputs?.result).toBe(15);
  });

  it("should handle decimal numbers", async () => {
    const nodeId = "sum";
    const node = new SumNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1.5, 2.3, 0.2],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(4);
  });

  it("should handle negative numbers", async () => {
    const nodeId = "sum";
    const node = new SumNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [-1, -2, 3, 4],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(4);
  });

  it("should handle empty array", async () => {
    const nodeId = "sum";
    const node = new SumNode({
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
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(0);
  });

  it("should return error for missing input", async () => {
    const nodeId = "sum";
    const node = new SumNode({
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
    const nodeId = "sum";
    const node = new SumNode({
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
    const nodeId = "sum";
    const node = new SumNode({
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
    expect(result.outputs?.result).toBe(6);
  });

  it("should handle large array of numbers", async () => {
    const nodeId = "sum";
    const node = new SumNode({
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
    expect(result.outputs?.result).toBe(5050); // Sum of 1 to 100
  });
});
