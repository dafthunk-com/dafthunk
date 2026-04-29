import { CanvasInputNode } from "@dafthunk/runtime/nodes/input/canvas-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import { createCloudflareModelNode } from "./cloudflare-model-template";

export const imageDescriptionTemplate: WorkflowTemplate = {
  id: "image-description",
  name: "Image Description",
  description: "Draw on a canvas and get an AI-generated description",
  icon: "pencil",
  trigger: "manual",
  tags: ["image", "ai"],
  nodes: [
    CanvasInputNode.create({
      id: "canvas-drawing",
      name: "Canvas Drawing",
      position: { x: 100, y: 100 },
      inputs: {
        width: 300,
        height: 300,
        strokeColor: "#000000",
        strokeWidth: 2,
      },
    }),
    createCloudflareModelNode({
      id: "image-describer",
      name: "Image Describer",
      position: { x: 500, y: 100 },
      model: "@cf/unum/uform-gen2-qwen-500m",
      inputs: [
        {
          name: "image",
          type: "image",
          description: "The image to generate a description for",
          required: true,
        },
        {
          name: "prompt",
          type: "string",
          description: "Text prompt that guides the model's response",
          hidden: true,
          value: "Generate a caption for this image",
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum number of tokens to generate",
          hidden: true,
          value: 512,
        },
      ],
      outputs: [
        {
          name: "description",
          type: "string",
          description: "Generated text description of the image",
        },
      ],
    }),
    TextOutputNode.create({
      id: "description-preview",
      name: "Description",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "canvas-drawing",
      target: "image-describer",
      sourceOutput: "image",
      targetInput: "image",
    },
    {
      source: "image-describer",
      target: "description-preview",
      sourceOutput: "description",
      targetInput: "value",
    },
  ],
};
