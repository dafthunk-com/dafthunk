import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { SingleVariableStringTemplateNode } from "./single-variable-string-template-node";

describe("SingleVariableStringTemplateNode", () => {
  it("should replace single variable in template", async () => {
    const nodeId = "single-variable-string-template";
    const node = new SingleVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${variable}!",
        variable: "John",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("Hello John!");
  });

  it("should handle template with no variables", async () => {
    const nodeId = "single-variable-string-template";
    const node = new SingleVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello World!",
        variable: "John",
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

  it("should handle empty variable", async () => {
    const nodeId = "single-variable-string-template";
    const node = new SingleVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${variable}!",
        variable: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello !");
  });

  it("should handle multiple variable occurrences", async () => {
    const nodeId = "single-variable-string-template";
    const node = new SingleVariableStringTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "Hello ${variable}, how are you ${variable}?",
        variable: "John",
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
