import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { SingleVariableStringTemplateNode } from "../nodes/text/single-variable-string-template-node";
import { TextAreaNode } from "../nodes/text/text-area-node";
import { dataTransformationPipelineTemplate } from "./data-transformation-pipeline";

describe("Data Transformation Pipeline Template", () => {
  it("should have correct node types defined", () => {
    expect(dataTransformationPipelineTemplate.nodes).toHaveLength(2);
    expect(dataTransformationPipelineTemplate.edges).toHaveLength(1);

    const nodeTypes = dataTransformationPipelineTemplate.nodes.map(
      (n) => n.type
    );
    expect(nodeTypes).toContain("text-area");
    expect(nodeTypes).toContain("single-variable-string-template");
  });

  it("should execute all nodes in the template", async () => {
    // Execute text area input node
    const inputNode = dataTransformationPipelineTemplate.nodes.find(
      (n) => n.id === "input-data-1"
    )!;
    const inputInstance = new TextAreaNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: "Hello World" } : input
      ),
    });
    const inputResult = await inputInstance.execute({
      nodeId: inputNode.id,
      inputs: { value: "Hello World" },
      env: env as Bindings,
    } as any);
    expect(inputResult.status).toBe("completed");
    expect(inputResult.outputs?.value).toBe("Hello World");

    // Execute template node
    const templateNode = dataTransformationPipelineTemplate.nodes.find(
      (n) => n.id === "template-1"
    )!;
    const templateInstance = new SingleVariableStringTemplateNode(templateNode);
    const templateResult = await templateInstance.execute({
      nodeId: templateNode.id,
      inputs: {
        template: "Processed Data: ${variable}",
        variable: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(templateResult.status).toBe("completed");
    expect(templateResult.outputs?.result).toBe("Processed Data: Hello World");
  });
});
