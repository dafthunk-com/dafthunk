import type { WorkflowTemplate } from "@dafthunk/types";

import { StableDiffusionXLLightningNode } from "../nodes/image/stable-diffusion-xl-lightning-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const imageGenerationTemplate: WorkflowTemplate = {
  id: "image-generation-with-prompt",
  name: "AI Image Generation",
  description: "Generate images from text prompts using Stable Diffusion",
  category: "content-creation",
  type: "manual",
  tags: ["ai", "image", "generation", "stable-diffusion"],
  nodes: [
    TextAreaNode.create({
      id: "prompt-input-1",
      position: { x: 100, y: 100 },
      description: "Enter description for image generation",
      inputs: { placeholder: "Enter your image prompt here...", rows: 4 },
    }),
    StableDiffusionXLLightningNode.create({
      id: "image-gen-1",
      position: { x: 500, y: 100 },
      description: "Generate image from prompt",
    }),
  ],
  edges: [
    {
      source: "prompt-input-1",
      target: "image-gen-1",
      sourceOutput: "value",
      targetInput: "prompt",
    },
  ],
};
