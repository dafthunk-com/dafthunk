import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SquareRootNode } from "./square-root-node";

describe("SquareRootNode", () => {
  it("should calculate square root of positive number", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 16,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(4);
  });

  it("should calculate square root of zero", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 0,
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

  it("should calculate square root of decimal number", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 2.25,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(1.5);
  });

  it("should handle string input that can be converted to number", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "25",
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

  it("should return error for negative number", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: -4,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Square root of negative numbers is not supported"
    );
  });

  it("should return error for invalid input", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "invalid",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input must be a number");
  });

  it("should return error for missing value input", async () => {
    const nodeId = "square-root";
    const node = new SquareRootNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input 'value' is required");
  });
});
