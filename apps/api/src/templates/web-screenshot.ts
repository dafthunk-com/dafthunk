import type { WorkflowTemplate } from "@dafthunk/types";

import { CloudflareBrowserScreenshotNode } from "../nodes/browser/cloudflare-browser-screenshot-node";
import { TextInputNode } from "../nodes/input/text-input-node";
import { ImageOutputNode } from "../nodes/output/image-output-node";

export const webScreenshotTemplate: WorkflowTemplate = {
  id: "web-screenshot",
  name: "Web Screenshot",
  description: "Capture a screenshot of any webpage",
  icon: "camera",
  type: "manual",
  tags: ["browser", "screenshot", "web"],
  nodes: [
    TextInputNode.create({
      id: "url-input",
      name: "URL",
      position: { x: 100, y: 100 },
      inputs: {
        value: "https://news.ycombinator.com",
        placeholder: "Enter URL to capture...",
        rows: 1,
      },
    }),
    CloudflareBrowserScreenshotNode.create({
      id: "screenshot-capture",
      name: "Screenshot",
      position: { x: 500, y: 100 },
    }),
    ImageOutputNode.create({
      id: "screenshot-preview",
      name: "Screenshot",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "url-input",
      target: "screenshot-capture",
      sourceOutput: "value",
      targetInput: "url",
    },
    {
      source: "screenshot-capture",
      target: "screenshot-preview",
      sourceOutput: "image",
      targetInput: "value",
    },
  ],
};
