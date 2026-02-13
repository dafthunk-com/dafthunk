import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { DivisionNode } from "./division-node";

describe("DivisionNode", () => {
  it("should divide two positive numbers", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 10,
        b: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(5);
  });

  it("should handle decimal division", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 7,
        b: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(3.5);
  });

  it("should handle negative numbers", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: -10,
        b: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(-5);
  });

  it("should handle string inputs that can be converted to numbers", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "15",
        b: "3",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(5);
  });

  it("should return error for division by zero", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 10,
        b: 0,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Division by zero is not allowed");
  });

  it("should return error for invalid first input", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "invalid",
        b: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Both inputs must be numbers");
  });

  it("should return error for invalid second input", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 10,
        b: "invalid",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Both inputs must be numbers");
  });

  it("should return error for missing first input", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        b: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input 'a' is required");
  });

  it("should return error for missing second input", async () => {
    const nodeId = "division";
    const node = new DivisionNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 10,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input 'b' is required");
  });
});
