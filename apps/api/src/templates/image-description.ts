import type { WorkflowTemplate } from "@dafthunk/types";

import { UformGen2Qwen500mNode } from "../nodes/image/uform-gen2-qwen-500m-node";
import { CanvasInputNode } from "../nodes/input/canvas-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";

export const imageDescriptionTemplate: WorkflowTemplate = {
  id: "image-description",
  name: "Image Description",
  description: "Draw on a canvas and get an AI-generated description",
  icon: "pencil",
  type: "manual",
  tags: ["image", "canvas", "ai", "caption"],
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
    UformGen2Qwen500mNode.create({
      id: "image-describer",
      name: "Image Describer",
      position: { x: 500, y: 100 },
    }),
    TextPreviewNode.create({
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
