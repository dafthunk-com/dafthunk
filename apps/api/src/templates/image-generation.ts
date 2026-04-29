import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { ImageOutputNode } from "@dafthunk/runtime/nodes/output/image-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import { createCloudflareModelNode } from "./cloudflare-model-template";

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
    createCloudflareModelNode({
      id: "image-generator",
      name: "Image Generator",
      position: { x: 500, y: 100 },
      model: "@cf/bytedance/stable-diffusion-xl-lightning",
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Text description of the image to generate",
          required: true,
        },
        {
          name: "negative_prompt",
          type: "string",
          description: "Elements to avoid in the generated image",
          hidden: true,
        },
        {
          name: "height",
          type: "number",
          description: "Height of the generated image in pixels",
          hidden: true,
          value: 1024,
        },
        {
          name: "width",
          type: "number",
          description: "Width of the generated image in pixels",
          hidden: true,
          value: 1024,
        },
        {
          name: "num_steps",
          type: "number",
          description: "Number of diffusion steps (1-20)",
          hidden: true,
          value: 20,
        },
        {
          name: "guidance",
          type: "number",
          description: "How closely the image should follow the prompt",
          hidden: true,
          value: 7.5,
        },
      ],
      outputs: [
        {
          name: "image",
          type: "image",
          description: "Generated image",
        },
      ],
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
