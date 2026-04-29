import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import { createCloudflareModelNode } from "./cloudflare-model-template";

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
    createCloudflareModelNode({
      id: "text-translator",
      name: "Text Translator",
      position: { x: 500, y: 200 },
      model: "@cf/meta/m2m100-1.2b",
      inputs: [
        {
          name: "text",
          type: "string",
          description: "Text to translate",
          required: true,
        },
        {
          name: "source_lang",
          type: "string",
          description: "Source language code (e.g., 'en')",
        },
        {
          name: "target_lang",
          type: "string",
          description: "Target language code (e.g., 'es')",
          required: true,
        },
      ],
      outputs: [
        {
          name: "translated_text",
          type: "string",
          description: "Translated text in the target language",
        },
      ],
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
      targetInput: "source_lang",
    },
    {
      source: "target-language",
      target: "text-translator",
      sourceOutput: "value",
      targetInput: "target_lang",
    },
    {
      source: "text-translator",
      target: "translation-preview",
      sourceOutput: "translated_text",
      targetInput: "value",
    },
  ],
};
