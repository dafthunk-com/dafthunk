import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { MedianNode } from "./median-node";

describe("MedianNode", () => {
  it("should return single number", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: 42,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(42);
  });

  it("should calculate median from odd number of values", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, 3, 5, 7, 9],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(5); // Middle value when sorted
  });

  it("should calculate median from even number of values", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, 2, 3, 4],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(2.5); // Average of 2 and 3
  });

  it("should handle unsorted input", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [9, 1, 5, 3, 7],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(5); // Sorted: [1,3,5,7,9], median is 5
  });

  it("should handle duplicate values", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [5, 2, 5, 8, 5],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(5); // Sorted: [2,5,5,5,8], median is 5
  });

  it("should handle negative numbers", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [-10, -5, -15, -20],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(-12.5); // Sorted: [-20,-15,-10,-5], median is (-15-10)/2 = -12.5
  });

  it("should handle mixed positive and negative numbers", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [-5, 10, -3, 7, -1],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(-1); // Sorted: [-5,-3,-1,7,10], median is -1
  });

  it("should handle decimal numbers", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1.5, 2.5, 3.5, 4.5],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(3); // Average of 2.5 and 3.5
  });

  it("should handle two numbers", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [10, 20],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(15); // Average of 10 and 20
  });

  it("should handle three numbers", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [15, 5, 25],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(15); // Sorted: [5,15,25], median is 15
  });

  it("should handle all same values", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [5, 5, 5, 5, 5],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(5);
  });

  it("should handle zero values", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [0, 5, -10, 0],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(0); // Sorted: [-10,0,0,5], median is 0
  });

  it("should handle large array of numbers", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    // Create an array of numbers 1 to 99 (odd number of elements)
    const numbers = Array.from({ length: 99 }, (_, i) => i + 1);

    const context = {
      nodeId,
      inputs: {
        numbers,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(50); // Median of 1 to 99 is 50
  });

  it("should handle large array with even number of elements", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    // Create an array of numbers 1 to 100 (even number of elements)
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

    const context = {
      nodeId,
      inputs: {
        numbers,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(50.5); // Median of 1 to 100 is average of 50 and 51
  });

  it("should handle string numbers by converting them", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: ["1", "3", "2", "4"],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(2.5); // Sorted: [1,2,3,4], median is average of 2 and 3
  });

  it("should return error for empty array", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Cannot calculate median of empty array");
  });

  it("should return error for missing input", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No number inputs provided");
  });

  it("should return error for invalid input type in array", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1, "not-a-number", 3],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Invalid input at position 1: expected number, got string"
    );
  });

  it("should handle precision correctly", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [1.1, 2.2, 3.3, 4.4],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    // Use toBeCloseTo for floating point comparison to handle precision issues
    expect(result.outputs?.result).toBeCloseTo(2.75, 10); // Average of 2.2 and 3.3
  });

  it("should handle edge case with one element", async () => {
    const nodeId = "median";
    const node = new MedianNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        numbers: [42],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(42);
  });
});
