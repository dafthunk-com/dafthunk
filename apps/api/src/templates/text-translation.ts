import type { WorkflowTemplate } from "@dafthunk/types";

import { TextInputNode } from "../nodes/input/text-input-node";
import { M2m10012bNode } from "../nodes/text/m2m100-1-2b-node";

export const textTranslationTemplate: WorkflowTemplate = {
  id: "text-translation",
  name: "Text Translation",
  description: "Translate text between different languages",
  icon: "languages",
  type: "manual",
  tags: ["text", "translation", "ai"],
  nodes: [
    TextInputNode.create({
      id: "input-1",
      position: { x: 100, y: 100 },
      description: "Text to translate",
      inputs: {
        value: "Hello, how are you today? I hope you are having a wonderful day.",
        placeholder: "Enter text here...",
        rows: 4,
      },
    }),
    M2m10012bNode.create({
      id: "translator-1",
      position: { x: 500, y: 100 },
      description: "Translate text",
      inputs: { sourceLang: "en", targetLang: "es" },
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "translator-1",
      sourceOutput: "value",
      targetInput: "text",
    },
  ],
};
