import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { StringToUpperCaseNode } from "./string-to-upper-case-node";

describe("StringToUpperCaseNode", () => {
  it("should convert string to uppercase", async () => {
    const nodeId = "string-to-upper-case";
    const node = new StringToUpperCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("HELLO WORLD");
  });

  it("should handle already uppercase string", async () => {
    const nodeId = "string-to-upper-case";
    const node = new StringToUpperCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "HELLO WORLD",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("HELLO WORLD");
  });

  it("should handle empty string", async () => {
    const nodeId = "string-to-upper-case";
    const node = new StringToUpperCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("");
  });
});
