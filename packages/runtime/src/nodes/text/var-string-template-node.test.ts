import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { VarStringTemplateNode } from "./var-string-template-node";

describe("VarStringTemplateNode", () => {
  it("should replace a single variable in template", async () => {
    const nodeId = "var-string-template";
    const node = new VarStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${var_1}!",
        var_1: "John",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello John!");
  });

  it("should replace multiple variables in template", async () => {
    const nodeId = "var-string-template";
    const node = new VarStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${var_1}, you are ${var_2} years old.",
        var_1: "John",
        var_2: "30",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello John, you are 30 years old.");
  });

  it("should handle template with no variables", async () => {
    const nodeId = "var-string-template";
    const node = new VarStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello World!",
        var_1: "John",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello World!");
  });

  it("should handle missing variables", async () => {
    const nodeId = "var-string-template";
    const node = new VarStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${var_1} ${var_2}!",
        var_1: "John",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello John ${var_2}!");
    expect(result.outputs?.missingVariables).toEqual(["var_2"]);
  });

  it("should handle empty template string", async () => {
    const nodeId = "var-string-template";
    const node = new VarStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "",
        var_1: "John",
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

  it("should handle same variable used multiple times", async () => {
    const nodeId = "var-string-template";
    const node = new VarStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${var_1}, how are you ${var_1}?",
        var_1: "John",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello John, how are you John?");
  });
});
