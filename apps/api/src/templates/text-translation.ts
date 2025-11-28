import type { WorkflowTemplate } from "@dafthunk/types";

import { M2m10012bNode } from "../nodes/text/m2m100-1-2b-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const textTranslationTemplate: WorkflowTemplate = {
  id: "text-translation",
  name: "Text Translation",
  description: "Translate text between different languages",
  category: "text-processing",
  type: "manual",
  tags: ["translation", "language", "ai", "text"],
  nodes: [
    TextAreaNode.create({
      id: "text-input-1",
      position: { x: 100, y: 100 },
      description: "Enter text to translate",
      inputs: { placeholder: "Enter text to translate...", rows: 4 },
    }),
    M2m10012bNode.create({
      id: "translation-1",
      position: { x: 500, y: 100 },
      description: "Multilingual translation model",
      inputs: { sourceLang: "en", targetLang: "es" },
    }),
  ],
  edges: [
    {
      source: "text-input-1",
      target: "translation-1",
      sourceOutput: "value",
      targetInput: "text",
    },
  ],
};
