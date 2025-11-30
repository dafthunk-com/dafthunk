import type { WorkflowTemplate } from "@dafthunk/types";

import { SingleVariableStringTemplateNode } from "../nodes/text/single-variable-string-template-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const textFormatterTemplate: WorkflowTemplate = {
  id: "text-formatter",
  name: "Text Formatter",
  description: "Format text using a simple template",
  category: "text-processing",
  type: "manual",
  tags: ["text", "formatting", "template"],
  nodes: [
    TextAreaNode.create({
      id: "input-1",
      position: { x: 100, y: 100 },
      description: "Text to format",
      inputs: { placeholder: "Enter text here...", rows: 4 },
    }),
    SingleVariableStringTemplateNode.create({
      id: "formatter-1",
      position: { x: 500, y: 100 },
      description: "Format text",
      inputs: { template: "Formatted: ${variable}" },
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "formatter-1",
      sourceOutput: "value",
      targetInput: "variable",
    },
  ],
};
