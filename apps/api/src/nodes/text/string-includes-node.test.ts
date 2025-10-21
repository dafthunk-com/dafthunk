import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringIncludesNode } from "./string-includes-node";

describe("StringIncludesNode", () => {
  it("should return true when substring is found", async () => {
    const nodeId = "string-includes";
    const node = new StringIncludesNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        needle: "World",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(true);
  });

  it("should return false when substring is not found", async () => {
    const nodeId = "string-includes";
    const node = new StringIncludesNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        needle: "Test",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(false);
  });

  it("should handle case sensitive search", async () => {
    const nodeId = "string-includes";
    const node = new StringIncludesNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        needle: "world",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(false);
  });

  it("should handle empty substring", async () => {
    const nodeId = "string-includes";
    const node = new StringIncludesNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        needle: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(true);
  });
});
