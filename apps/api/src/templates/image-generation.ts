import type { WorkflowTemplate } from "@dafthunk/types";

import { StableDiffusionXLLightningNode } from "../nodes/image/stable-diffusion-xl-lightning-node";
import { TextInputNode } from "../nodes/input/text-input-node";
import { ImagePreviewNode } from "../nodes/preview/image-preview-node";

export const imageGenerationTemplate: WorkflowTemplate = {
  id: "image-generation",
  name: "Image Generation",
  description: "Generate images from text prompts",
  icon: "image",
  type: "manual",
  tags: ["image", "generation", "ai"],
  nodes: [
    TextInputNode.create({
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
    ImagePreviewNode.create({
      id: "preview-1",
      position: { x: 900, y: 100 },
      description: "Preview image",
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "generator-1",
      sourceOutput: "value",
      targetInput: "prompt",
    },
    {
      source: "generator-1",
      target: "preview-1",
      sourceOutput: "image",
      targetInput: "value",
    },
  ],
};
