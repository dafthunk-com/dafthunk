import type { Parameter } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { SingleVariableStringTemplateNode } from "../nodes/text/single-variable-string-template-node";
import { TextAreaNode } from "../nodes/text/text-area-node";
import { textFormatterTemplate } from "./text-formatter";

describe("Text Formatter Template", () => {
  it("should have correct node types defined", () => {
    expect(textFormatterTemplate.nodes).toHaveLength(2);
    expect(textFormatterTemplate.edges).toHaveLength(1);

    const nodeTypes = textFormatterTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-area");
    expect(nodeTypes).toContain("single-variable-string-template");
  });

  it("should execute all nodes in the template", async () => {
    // Execute text area input node
    const inputNode = textFormatterTemplate.nodes.find(
      (n) => n.id === "input-1"
    )!;
    const inputInstance = new TextAreaNode({
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
      (n) => n.id === "formatter-1"
    )!;
    const formatterInstance = new SingleVariableStringTemplateNode(
      formatterNode
    );
    const formatterResult = await formatterInstance.execute({
      nodeId: formatterNode.id,
      inputs: {
        template: "Formatted: ${variable}",
        variable: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(formatterResult.status).toBe("completed");
    expect(formatterResult.outputs?.result).toBe("Formatted: Hello World");
  });
});
