import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ExponentiationNode } from "./exponentiation-node";

describe("ExponentiationNode", () => {
  it("should calculate positive base to positive exponent", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: 2,
        exponent: 3,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(8);
  });

  it("should calculate negative base to positive exponent", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: -2,
        exponent: 3,
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

  it("should calculate base to zero exponent", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: 5,
        exponent: 0,
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

  it("should calculate base to negative exponent", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: 2,
        exponent: -2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(0.25);
  });

  it("should handle decimal base and exponent", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: 2.5,
        exponent: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(6.25);
  });

  it("should handle string inputs that can be converted to numbers", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: "3",
        exponent: "4",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(81);
  });

  it("should return error for invalid base input", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: "invalid",
        exponent: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Both inputs must be numbers");
  });

  it("should return error for invalid exponent input", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: 2,
        exponent: "invalid",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Both inputs must be numbers");
  });

  it("should return error for missing base input", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        exponent: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input 'base' is required");
  });

  it("should return error for missing exponent input", async () => {
    const nodeId = "exponentiation";
    const node = new ExponentiationNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        base: 2,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input 'exponent' is required");
  });
});
