import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
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
      getIntegration: async () => {
        throw new Error("No integrations in test");
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
      getIntegration: async () => {
        throw new Error("No integrations in test");
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
      getIntegration: async () => {
        throw new Error("No integrations in test");
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
