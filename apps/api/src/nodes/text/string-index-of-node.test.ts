import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { StringIndexOfNode } from "./string-index-of-node";

describe("StringIndexOfNode", () => {
  it("should return correct index when substring is found", async () => {
    const nodeId = "string-index-of";
    const node = new StringIndexOfNode({
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
    expect(result.outputs?.result).toBe(6);
  });

  it("should return -1 when substring is not found", async () => {
    const nodeId = "string-index-of";
    const node = new StringIndexOfNode({
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
    expect(result.outputs?.result).toBe(-1);
  });

  it("should return 0 for empty substring", async () => {
    const nodeId = "string-index-of";
    const node = new StringIndexOfNode({
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
    expect(result.outputs?.result).toBe(0);
  });

  it("should handle case sensitive search", async () => {
    const nodeId = "string-index-of";
    const node = new StringIndexOfNode({
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
    expect(result.outputs?.result).toBe(-1);
  });
});
