import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringTrimNode } from "./string-trim-node";

describe("StringTrimNode", () => {
  it("should trim whitespace from both ends", async () => {
    const nodeId = "string-trim";
    const node = new StringTrimNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "  Hello World  ",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello World");
  });

  it("should handle string with no whitespace", async () => {
    const nodeId = "string-trim";
    const node = new StringTrimNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "HelloWorld",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("HelloWorld");
  });

  it("should handle empty string", async () => {
    const nodeId = "string-trim";
    const node = new StringTrimNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("");
  });

  it("should handle string with only whitespace", async () => {
    const nodeId = "string-trim";
    const node = new StringTrimNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "   \n\t  ",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("");
  });
});
