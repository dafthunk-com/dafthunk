import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { MultiplicationNode } from "./multiplication-node";

describe("MultiplicationNode", () => {
  it("should multiply two positive numbers", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 5,
        b: 3,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(15);
  });

  it("should multiply positive and negative numbers", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 4,
        b: -2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(-8);
  });

  it("should multiply two negative numbers", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: -3,
        b: -4,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(12);
  });

  it("should handle decimal numbers", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 2.5,
        b: 1.5,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(3.75);
  });

  it("should handle zero multiplication", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 5,
        b: 0,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(0);
  });

  it("should handle string inputs that can be converted to numbers", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "6",
        b: "7",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(42);
  });

  it("should return error for invalid first input", async () => {
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "invalid",
        b: 3,
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
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 5,
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
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        b: 3,
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
    const nodeId = "multiplication";
    const node = new MultiplicationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 5,
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
