import { StableDiffusionXLLightningNode } from "@dafthunk/runtime/nodes/image/stable-diffusion-xl-lightning-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { ImageOutputNode } from "@dafthunk/runtime/nodes/output/image-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const imageGenerationTemplate: WorkflowTemplate = {
  id: "image-generation",
  name: "Image Generation",
  description: "Generate images from text prompts",
  icon: "image",
  trigger: "manual",
  tags: ["image", "ai"],
  nodes: [
    TextInputNode.create({
      id: "image-prompt",
      name: "Image Prompt",
      position: { x: 100, y: 100 },
      inputs: {
        value:
          "A majestic mountain landscape at sunset with vibrant orange and purple colors",
        placeholder: "Enter text here...",
        rows: 4,
      },
    }),
    StableDiffusionXLLightningNode.create({
      id: "image-generator",
      name: "Image Generator",
      position: { x: 500, y: 100 },
    }),
    ImageOutputNode.create({
      id: "generated-image-preview",
      name: "Generated Image",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "image-prompt",
      target: "image-generator",
      sourceOutput: "value",
      targetInput: "prompt",
    },
    {
      source: "image-generator",
      target: "generated-image-preview",
      sourceOutput: "image",
      targetInput: "value",
    },
  ],
};
