import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { M2m10012bNode } from "@dafthunk/runtime/nodes/text/m2m100-1-2b-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const textTranslationTemplate: WorkflowTemplate = {
  id: "text-translation",
  name: "Text Translation",
  description: "Translate text between different languages",
  icon: "languages",
  trigger: "manual",
  tags: ["text", "ai"],
  nodes: [
    TextInputNode.create({
      id: "text-to-translate",
      name: "Text to Translate",
      position: { x: 100, y: 0 },
      inputs: {
        value:
          "Hello, how are you today? I hope you are having a wonderful day.",
        placeholder: "Enter text here...",
        rows: 4,
      },
    }),
    TextInputNode.create({
      id: "source-language",
      name: "Source Language",
      position: { x: 100, y: 200 },
      inputs: {
        value: "en",
        placeholder: "e.g. en",
        rows: 1,
      },
    }),
    TextInputNode.create({
      id: "target-language",
      name: "Target Language",
      position: { x: 100, y: 400 },
      inputs: {
        value: "es",
        placeholder: "e.g. es",
        rows: 1,
      },
    }),
    M2m10012bNode.create({
      id: "text-translator",
      name: "Text Translator",
      position: { x: 500, y: 200 },
    }),
    TextOutputNode.create({
      id: "translation-preview",
      name: "Translation",
      position: { x: 900, y: 200 },
    }),
  ],
  edges: [
    {
      source: "text-to-translate",
      target: "text-translator",
      sourceOutput: "value",
      targetInput: "text",
    },
    {
      source: "source-language",
      target: "text-translator",
      sourceOutput: "value",
      targetInput: "sourceLang",
    },
    {
      source: "target-language",
      target: "text-translator",
      sourceOutput: "value",
      targetInput: "targetLang",
    },
    {
      source: "text-translator",
      target: "translation-preview",
      sourceOutput: "translatedText",
      targetInput: "value",
    },
  ],
};
