import type { WorkflowTemplate } from "@dafthunk/types";

import { PhotonAdjustContrastNode } from "../nodes/image/photon-adjust-contrast-node";
import { PhotonInvertColorsNode } from "../nodes/image/photon-invert-colors-node";
import { PhotonPixelizeNode } from "../nodes/image/photon-pixelize-node";
import { WebcamInputNode } from "../nodes/input/webcam-input-node";
import { ImageOutputNode } from "../nodes/output/image-output-node";

export const imageProcessingTemplate: WorkflowTemplate = {
  id: "image-processing",
  name: "Image Processing",
  description: "Capture a photo and apply a pop art style effect",
  icon: "camera",
  trigger: "manual",
  tags: ["image", "webcam", "processing", "photon", "pop-art"],
  nodes: [
    WebcamInputNode.create({
      id: "webcam-capture",
      name: "Webcam Capture",
      position: { x: 100, y: 200 },
    }),
    PhotonInvertColorsNode.create({
      id: "invert-colors",
      name: "Invert",
      position: { x: 400, y: 200 },
    }),
    PhotonAdjustContrastNode.create({
      id: "high-contrast",
      name: "High Contrast",
      position: { x: 700, y: 200 },
      inputs: { amount: 80 },
    }),
    PhotonPixelizeNode.create({
      id: "pixelize",
      name: "Pixelize",
      position: { x: 1000, y: 200 },
      inputs: { pixelSize: 8 },
    }),
    ImageOutputNode.create({
      id: "result-preview",
      name: "Result",
      position: { x: 1300, y: 200 },
    }),
  ],
  edges: [
    {
      source: "webcam-capture",
      target: "invert-colors",
      sourceOutput: "image",
      targetInput: "image",
    },
    {
      source: "invert-colors",
      target: "high-contrast",
      sourceOutput: "image",
      targetInput: "image",
    },
    {
      source: "high-contrast",
      target: "pixelize",
      sourceOutput: "image",
      targetInput: "image",
    },
    {
      source: "pixelize",
      target: "result-preview",
      sourceOutput: "image",
      targetInput: "value",
    },
  ],
};
