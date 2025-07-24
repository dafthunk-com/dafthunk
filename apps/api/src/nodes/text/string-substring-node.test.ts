import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringSubstringNode } from "./string-substring-node";

describe("StringSubstringNode", () => {
  it("should extract substring with start and end indices", async () => {
    const nodeId = "string-substring";
    const node = new StringSubstringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        start: 0,
        end: 5,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello");
  });

  it("should extract substring with only start index", async () => {
    const nodeId = "string-substring";
    const node = new StringSubstringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        start: 6,
        end: 11,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("World");
  });

  it("should handle negative start index", async () => {
    const nodeId = "string-substring";
    const node = new StringSubstringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "Hello World",
        start: 6,
        end: 11,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("World");
  });

  it("should handle empty string", async () => {
    const nodeId = "string-substring";
    const node = new StringSubstringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        haystack: "",
        start: 0,
        end: 0,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("");
  });
});
