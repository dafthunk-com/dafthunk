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
      id: "input-1",
      position: { x: -43, y: 216.5 },
      inputs: { value: "World", placeholder: "Enter text here...", rows: 4 },
    }),
    TextInputNode.create({
      id: "text-input-template",
      position: { x: -43.75, y: -52 },
      inputs: { value: "Hello, ${variable}!", rows: 4 },
    }),
    SingleVariableStringTemplateNode.create({
      id: "formatter-1",
      position: { x: 298, y: 124.5 },
    }),
    TextPreviewNode.create({
      id: "preview-text-1",
      position: { x: 650.13, y: 50 },
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "formatter-1",
      sourceOutput: "value",
      targetInput: "variable",
    },
    {
      source: "text-input-template",
      target: "formatter-1",
      sourceOutput: "value",
      targetInput: "template",
    },
    {
      source: "formatter-1",
      target: "preview-text-1",
      sourceOutput: "result",
      targetInput: "value",
    },
  ],
};
