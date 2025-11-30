import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { StableDiffusionXLLightningNode } from "../nodes/image/stable-diffusion-xl-lightning-node";
import { TextAreaNode } from "../nodes/text/text-area-node";
import { imageGenerationTemplate } from "./image-generation";

describe("Image Generation Template", () => {
  it("should have correct node types defined", () => {
    expect(imageGenerationTemplate.nodes).toHaveLength(2);
    expect(imageGenerationTemplate.edges).toHaveLength(1);

    const nodeTypes = imageGenerationTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("text-area");
    expect(nodeTypes).toContain("stable-diffusion-xl-lightning");
  });

  it("should execute all nodes in the template", async () => {
    const prompt = "A beautiful sunset over the ocean";

    // Execute input node
    const inputNode = imageGenerationTemplate.nodes.find(
      (n) => n.id === "input-1"
    )!;
    const inputInstance = new TextAreaNode({
      ...inputNode,
      inputs: inputNode.inputs.map((input) =>
        input.name === "value" ? { ...input, value: prompt } : input
      ),
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
      (n) => n.id === "generator-1"
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
  });
});
