import { Gemini25FlashImageUnderstandingNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-image-understanding-node";
import { Gemini25FlashTtsNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-tts-node";
import { HttpRequestNode } from "@dafthunk/runtime/nodes/http/http-request-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const imageToTextTemplate: WorkflowTemplate = {
  id: "image-to-text",
  name: "Image to Text",
  description:
    "Extract text from an image and convert it to speech via HTTP request",
  icon: "eye",
  trigger: "http_request",
  tags: ["api", "ai", "image", "audio"],
  nodes: [
    HttpRequestNode.create({
      id: "request",
      name: "HTTP Request",
      position: { x: 100, y: 200 },
    }),
    Gemini25FlashImageUnderstandingNode.create({
      id: "image-understanding",
      name: "Image Understanding",
      position: { x: 500, y: 200 },
      inputs: {
        prompt: "Extract the text from the image",
      },
    }),
    Gemini25FlashTtsNode.create({
      id: "text-to-speech",
      name: "Text to Speech",
      position: { x: 900, y: 200 },
      inputs: {
        voice: "Kore",
      },
    }),
  ],
  edges: [
    {
      source: "request",
      target: "image-understanding",
      sourceOutput: "body",
      targetInput: "image",
    },
    {
      source: "image-understanding",
      target: "text-to-speech",
      sourceOutput: "text",
      targetInput: "text",
    },
  ],
};
