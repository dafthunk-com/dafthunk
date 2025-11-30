import type { WorkflowTemplate } from "@dafthunk/types";

import { TextInputNode } from "../nodes/input/text-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";
import { SingleVariableStringTemplateNode } from "../nodes/text/single-variable-string-template-node";

export const textFormatterTemplate: WorkflowTemplate = {
  id: "text-formatter",
  name: "Text Formatter",
  description: "Format text using a simple template",
  icon: "text",
  type: "manual",
  tags: ["text", "formatting", "template"],
  nodes: [
    TextInputNode.create({
      id: "text-variable",
      name: "Text Variable",
      position: { x: -43, y: 216.5 },
      inputs: { value: "World", placeholder: "Enter text here...", rows: 4 },
    }),
    TextInputNode.create({
      id: "text-template",
      name: "Text Template",
      position: { x: -43.75, y: -52 },
      inputs: { value: "Hello, ${variable}!", rows: 4 },
    }),
    SingleVariableStringTemplateNode.create({
      id: "template-formatter",
      name: "Template Formatter",
      position: { x: 298, y: 124.5 },
    }),
    TextPreviewNode.create({
      id: "formatted-text-preview",
      name: "Formatted Text",
      position: { x: 650.13, y: 50 },
    }),
  ],
  edges: [
    {
      source: "text-variable",
      target: "template-formatter",
      sourceOutput: "value",
      targetInput: "variable",
    },
    {
      source: "text-template",
      target: "template-formatter",
      sourceOutput: "value",
      targetInput: "template",
    },
    {
      source: "template-formatter",
      target: "formatted-text-preview",
      sourceOutput: "result",
      targetInput: "value",
    },
  ],
};
