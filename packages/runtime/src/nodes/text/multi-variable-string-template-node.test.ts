import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { MultiVariableStringTemplateNode } from "./multi-variable-string-template-node";

describe("MultiVariableStringTemplateNode", () => {
  it("should replace multiple variables in template", async () => {
    const nodeId = "multi-variable-string-template";
    const node = new MultiVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${name}, you are ${age} years old.",
        variables: {
          name: "John",
          age: "30",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello John, you are 30 years old.");
  });

  it("should handle template with no variables", async () => {
    const nodeId = "multi-variable-string-template";
    const node = new MultiVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello World!",
        variables: {
          name: "John",
          age: "30",
        },
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

  it("should handle empty variables object", async () => {
    const nodeId = "multi-variable-string-template";
    const node = new MultiVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${name}!",
        variables: {},
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello ${name}!");
  });

  it("should handle missing variables", async () => {
    const nodeId = "multi-variable-string-template";
    const node = new MultiVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${name} ${surname}!",
        variables: {
          name: "John",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello John ${surname}!");
  });
});
