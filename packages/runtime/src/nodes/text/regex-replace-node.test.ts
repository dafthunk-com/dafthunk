import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { RegexReplaceNode } from "./regex-replace-node";

describe("RegexReplaceNode", () => {
  it("should replace matches with replacement string", async () => {
    const nodeId = "regex-replace";
    const node = new RegexReplaceNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello 123 World 456",
        pattern: "\\d+",
        replacement: "XXX",
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
    expect(result.outputs?.result).toBe("Hello XXX World XXX");
  });

  it("should handle case insensitive replacement", async () => {
    const nodeId = "regex-replace";
    const node = new RegexReplaceNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello HELLO hello",
        pattern: "hello",
        replacement: "WORLD",
        flags: "gi",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("WORLD WORLD WORLD");
  });

  it("should return original string when no matches", async () => {
    const nodeId = "regex-replace";
    const node = new RegexReplaceNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
        pattern: "\\d+",
        replacement: "XXX",
        flags: "g",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello World");
  });
});
