import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { StringConcatNode } from "./string-concat-node";

describe("StringConcatNode", () => {
  it("should concatenate single string", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input_1: "Hello World",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello World");
  });

  it("should concatenate multiple strings from dynamic inputs", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input_1: "Hello",
        input_2: " ",
        input_3: "World",
        input_4: "!",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello World!");
  });

  it("should handle empty strings in inputs", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input_1: "",
        input_2: "test",
        input_3: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("test");
  });

  it("should return error for missing input", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
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
    expect(result.error).toContain("No string inputs provided");
  });

  it("should return error for invalid input type", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input_1: "Hello",
        input_2: 123,
        input_3: "World",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Invalid input at position 1: expected string, got number"
    );
  });

  it("should skip undefined inputs and preserve order", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input_1: "A",
        input_2: undefined,
        input_3: "B",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("AB");
  });
});
