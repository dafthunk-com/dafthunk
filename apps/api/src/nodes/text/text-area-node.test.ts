import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { TextAreaNode } from "./text-area-node";

describe("TextAreaNode", () => {
  it("should return the input value", async () => {
    const nodeId = "text-area";
    const node = new TextAreaNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "Hello World\nThis is a multi-line text.",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(
      "Hello World\nThis is a multi-line text."
    );
  });

  it("should handle empty string", async () => {
    const nodeId = "text-area";
    const node = new TextAreaNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("");
  });

  it("should handle undefined value", async () => {
    const nodeId = "text-area";
    const node = new TextAreaNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Value must be a string");
  });

  it("should handle multi-line text", async () => {
    const nodeId = "text-area";
    const node = new TextAreaNode({
      nodeId,
    } as unknown as Node);

    const multiLineText = "Line 1\nLine 2\nLine 3";
    const context = {
      nodeId,
      inputs: {
        value: multiLineText,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(multiLineText);
  });
});
