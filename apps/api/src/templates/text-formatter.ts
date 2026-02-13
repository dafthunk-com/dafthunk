import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { SingleVariableStringTemplateNode } from "@dafthunk/runtime/nodes/text/single-variable-string-template-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const textFormatterTemplate: WorkflowTemplate = {
  id: "text-formatter",
  name: "Text Formatter",
  description: "Format text using a simple template",
  icon: "text",
  trigger: "manual",
  tags: ["text"],
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
    TextOutputNode.create({
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
