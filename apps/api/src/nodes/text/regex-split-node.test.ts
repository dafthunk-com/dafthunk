import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { RegexSplitNode } from "./regex-split-node";

describe("RegexSplitNode", () => {
  it("should split string by pattern", async () => {
    const nodeId = "regex-split";
    const node = new RegexSplitNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello,World,Test",
        pattern: ",",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBeDefined();
    expect(Array.isArray(result.outputs?.result)).toBe(true);
    expect(result.outputs?.result).toEqual(["Hello", "World", "Test"]);
  });

  it("should split by multiple whitespace", async () => {
    const nodeId = "regex-split";
    const node = new RegexSplitNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello   World\tTest",
        pattern: "\\s+",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["Hello", "World", "Test"]);
  });

  it("should handle empty string", async () => {
    const nodeId = "regex-split";
    const node = new RegexSplitNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "",
        pattern: ",",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual([""]);
  });
});
