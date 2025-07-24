import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { RegexMatchNode } from "./regex-match-node";

describe("RegexMatchNode", () => {
  it("should return true when pattern matches", async () => {
    const nodeId = "regex-match";
    const node = new RegexMatchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello 123 World",
        pattern: "\\d+",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(true);
  });

  it("should return false when pattern does not match", async () => {
    const nodeId = "regex-match";
    const node = new RegexMatchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
        pattern: "\\d+",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(false);
  });

  it("should handle case insensitive matching", async () => {
    const nodeId = "regex-match";
    const node = new RegexMatchNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
        pattern: "hello",
        flags: "i",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(true);
  });
});
