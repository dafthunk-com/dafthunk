import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { MaxNode } from "./max-node";

describe("MaxNode", () => {
  it("should return single number", async () => {
    const nodeId = "max";
    const node = new MaxNode({
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

  it("should find maximum from multiple numbers", async () => {
    const nodeId = "max";
    const node = new MaxNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, 5, 3, 9, 2],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(9);
  });

  it("should handle decimal numbers", async () => {
    const nodeId = "max";
    const node = new MaxNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1.5, 2.3, 0.2, 3.7],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(3.7);
  });

  it("should handle negative numbers", async () => {
    const nodeId = "max";
    const node = new MaxNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [-10, -5, -20, -1],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(-1);
  });

  it("should handle mixed positive and negative numbers", async () => {
    const nodeId = "max";
    const node = new MaxNode({
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
    expect(result.outputs?.result).toBe(10);
  });

  it("should handle duplicate maximum values", async () => {
    const nodeId = "max";
    const node = new MaxNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, 5, 5, 3, 2],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(5);
  });

  it("should return error for empty array", async () => {
    const nodeId = "max";
    const node = new MaxNode({
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
    expect(result.error).toContain("Cannot find maximum of empty array");
  });

  it("should return error for missing input", async () => {
    const nodeId = "max";
    const node = new MaxNode({
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
    const nodeId = "max";
    const node = new MaxNode({
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
    const nodeId = "max";
    const node = new MaxNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: ["1", "5", "3"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(5);
  });

  it("should handle large array of numbers", async () => {
    const nodeId = "max";
    const node = new MaxNode({
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
    expect(result.outputs?.result).toBe(100);
  });

  it("should handle zero values", async () => {
    const nodeId = "max";
    const node = new MaxNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [0, -5, 10, 0],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(10);
  });
});
