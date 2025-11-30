import type { WorkflowTemplate } from "@dafthunk/types";

import { StableDiffusionXLLightningNode } from "../nodes/image/stable-diffusion-xl-lightning-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const imageGenerationTemplate: WorkflowTemplate = {
  id: "image-generation",
  name: "Image Generation",
  description: "Generate images from text prompts",
  category: "content-creation",
  type: "manual",
  tags: ["image", "generation", "ai"],
  nodes: [
    TextAreaNode.create({
      id: "input-1",
      position: { x: 100, y: 100 },
      description: "Image prompt",
      inputs: { placeholder: "Enter text here...", rows: 4 },
    }),
    StableDiffusionXLLightningNode.create({
      id: "generator-1",
      position: { x: 500, y: 100 },
      description: "Generate image",
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "generator-1",
      sourceOutput: "value",
      targetInput: "prompt",
    },
  ],
};
