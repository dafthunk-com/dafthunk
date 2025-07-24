import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringNormalizeNode } from "./string-normalize-node";

describe("StringNormalizeNode", () => {
  it("should normalize string with NFC form", async () => {
    const nodeId = "string-normalize";
    const node = new StringNormalizeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "café",
        form: "NFC",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("café");
  });

  it("should normalize string with NFD form", async () => {
    const nodeId = "string-normalize";
    const node = new StringNormalizeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "café",
        form: "NFD",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBeDefined();
    expect(typeof result.outputs?.result).toBe("string");
  });

  it("should handle empty string", async () => {
    const nodeId = "string-normalize";
    const node = new StringNormalizeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "",
        form: "NFC",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("");
  });

  it("should handle string without special characters", async () => {
    const nodeId = "string-normalize";
    const node = new StringNormalizeNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
        form: "NFC",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello World");
  });
});
