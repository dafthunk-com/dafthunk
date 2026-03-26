import { env } from "cloudflare:test";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { VarStringTemplateNode } from "@dafthunk/runtime/nodes/text/var-string-template-node";
import type { Parameter } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import type { Bindings } from "../context";
import { textFormatterTemplate } from "./text-formatter";

describe("Text Formatter Template", () => {
  it("should have correct node types defined", () => {
    expect(textFormatterTemplate.nodes).toHaveLength(4);
    expect(textFormatterTemplate.edges).toHaveLength(3);

    const nodeTypes = textFormatterTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("var-string-template");
    expect(nodeTypes).toContain("output-text");
  });

  it("should execute all nodes in the template", async () => {
    // Execute text variable input node
    const inputNode = textFormatterTemplate.nodes.find(
      (n) => n.id === "text-variable"
    )!;
    const inputInstance = new TextInputNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: "Hello World" } : input
      ) as Parameter[],
    });
    const inputResult = await inputInstance.execute({
      nodeId: inputNode.id,
      inputs: { value: "Hello World" },
      env: env as Bindings,
    } as any);
    expect(inputResult.status).toBe("completed");
    expect(inputResult.outputs?.value).toBe("Hello World");

    // Execute formatter node
    const formatterNode = textFormatterTemplate.nodes.find(
      (n) => n.id === "template-formatter"
    )!;
    const formatterInstance = new VarStringTemplateNode(formatterNode);
    const formatterResult = await formatterInstance.execute({
      nodeId: formatterNode.id,
      inputs: {
        template: "Formatted: ${var_1}",
        var_1: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(formatterResult.status).toBe("completed");
    expect(formatterResult.outputs?.result).toBe("Formatted: Hello World");
  });
});
