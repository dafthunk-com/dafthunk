import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringConcatNode } from "./string-concat-node";

describe("StringConcatNode", () => {
  it("should concatenate two strings", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "Hello",
        b: " World",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello World");
  });

  it("should handle empty strings", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "",
        b: "test",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("test");
  });

  it("should return error for missing first string", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        b: "World",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid or missing first string");
  });

  it("should return error for missing second string", async () => {
    const nodeId = "string-concat";
    const node = new StringConcatNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        a: "Hello",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid or missing second string");
  });
});
