import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ModuloNode } from "./modulo-node";

describe("ModuloNode", () => {
  it("should calculate remainder of positive numbers", async () => {
    const nodeId = "modulo";
    const node = new ModuloNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 7,
        b: 3,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(1);
  });

  it("should handle exact division", async () => {
    const nodeId = "modulo";
    const node = new ModuloNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 8,
        b: 2,
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

  it("should handle negative dividend", async () => {
    const nodeId = "modulo";
    const node = new ModuloNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: -7,
        b: 3,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(-1);
  });

  it("should handle negative divisor", async () => {
    const nodeId = "modulo";
    const node = new ModuloNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 7,
        b: -3,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(1);
  });

  it("should handle decimal numbers", async () => {
    const nodeId = "modulo";
    const node = new ModuloNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: 7.5,
        b: 2.5,
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
    const nodeId = "modulo";
    const node = new ModuloNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "10",
        b: "3",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(1);
  });

  it("should return error for division by zero", async () => {
    const nodeId = "modulo";
    const node = new ModuloNode({
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
    const nodeId = "modulo";
    const node = new ModuloNode({
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
    const nodeId = "modulo";
    const node = new ModuloNode({
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
    const nodeId = "modulo";
    const node = new ModuloNode({
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
    const nodeId = "modulo";
    const node = new ModuloNode({
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
