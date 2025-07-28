import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
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
        strings: "Hello World",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello World");
  });

  it("should concatenate multiple strings from array", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        strings: ["Hello", " ", "World", "!"],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello World!");
  });

  it("should handle empty strings in array", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        strings: ["", "test", ""],
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No string inputs provided");
  });

  it("should return error for invalid input type in array", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        strings: ["Hello", 123, "World"],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Invalid input at position 1: expected string, got number"
    );
  });
});
