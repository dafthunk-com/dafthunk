import { env } from "cloudflare:test";
import type { Parameter } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { StableDiffusionXLLightningNode } from "../nodes/image/stable-diffusion-xl-lightning-node";
import { TextInputNode } from "../nodes/input/text-input-node";
import { ImageOutputNode } from "../nodes/output/image-output-node";
import { imageGenerationTemplate } from "./image-generation";

describe("Image Generation Template", () => {
  it("should have correct node types defined", () => {
    expect(imageGenerationTemplate.nodes).toHaveLength(3);
    expect(imageGenerationTemplate.edges).toHaveLength(2);

    const nodeTypes = imageGenerationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-input");
    expect(nodeTypes).toContain("stable-diffusion-xl-lightning");
    expect(nodeTypes).toContain("output-image");
  });

  it("should execute all nodes in the template", async () => {
    const prompt = "A beautiful sunset over the ocean";

    // Execute input node
    const inputNode = imageGenerationTemplate.nodes.find(
      (n) => n.id === "image-prompt"
    )!;
    const inputInstance = new TextInputNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: prompt } : input
      ) as Parameter[],
    });
    const inputResult = await inputInstance.execute({
      nodeId: inputNode.id,
      inputs: { value: prompt },
      env: env as Bindings,
    } as any);
    expect(inputResult.status).toBe("completed");
    expect(inputResult.outputs?.value).toBe(prompt);

    // Execute generator node
    const generatorNode = imageGenerationTemplate.nodes.find(
      (n) => n.id === "image-generator"
    )!;
    const generatorInstance = new StableDiffusionXLLightningNode(generatorNode);
    const generatorResult = await generatorInstance.execute({
      nodeId: generatorNode.id,
      inputs: {
        prompt: inputResult.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(generatorResult.status).toBe("completed");
    expect(generatorResult.outputs?.image).toBeDefined();

    // Execute output node
    const outputNode = imageGenerationTemplate.nodes.find(
      (n) => n.id === "generated-image-preview"
    )!;
    const outputInstance = new ImageOutputNode(outputNode);
    const outputResult = await outputInstance.execute({
      nodeId: outputNode.id,
      inputs: {
        value: generatorResult.outputs?.image,
      },
      env: env as Bindings,
    } as any);
    expect(outputResult.status).toBe("completed");
    expect(outputResult.outputs?.displayValue).toBeDefined();
  });
});
