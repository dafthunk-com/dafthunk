import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { RegexExtractNode } from "./regex-extract-node";

describe("RegexExtractNode", () => {
  it("should extract matches from string", async () => {
    const nodeId = "regex-extract";
    const node = new RegexExtractNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello 123 World 456",
        pattern: "\\d+",
        flags: "g",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.matches).toBeDefined();
    expect(Array.isArray(result.outputs?.matches)).toBe(true);
    expect(result.outputs?.matches).toEqual(["123", "456"]);
  });

  it("should handle case insensitive matching", async () => {
    const nodeId = "regex-extract";
    const node = new RegexExtractNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello HELLO hello",
        pattern: "hello",
        flags: "gi",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.matches).toEqual(["Hello", "HELLO", "hello"]);
  });

  it("should return empty array when no matches", async () => {
    const nodeId = "regex-extract";
    const node = new RegexExtractNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
        pattern: "\\d+",
        flags: "g",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.matches).toEqual([]);
  });

  it("should return error for invalid regex", async () => {
    const nodeId = "regex-extract";
    const node = new RegexExtractNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
        pattern: "[",
        flags: "g",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid regex");
  });
});
