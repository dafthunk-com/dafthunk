import type { WorkflowTemplate } from "@dafthunk/types";

import { SingleVariableStringTemplateNode } from "../nodes/text/single-variable-string-template-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const dataTransformationPipelineTemplate: WorkflowTemplate = {
  id: "data-transformation-pipeline",
  name: "Data Transformation Pipeline",
  description: "Transform and process text data through multiple steps",
  category: "data-processing",
  type: "manual",
  tags: ["text", "transformation", "processing", "pipeline"],
  nodes: [
    TextAreaNode.create({
      id: "input-data-1",
      position: { x: 100, y: 100 },
      description: "Enter raw data to process",
      inputs: { placeholder: "Enter your data here...", rows: 6 },
    }),
    SingleVariableStringTemplateNode.create({
      id: "template-1",
      position: { x: 500, y: 100 },
      description: "Format the processed data",
      inputs: { template: "Processed Data: ${variable}" },
    }),
  ],
  edges: [
    {
      source: "input-data-1",
      target: "template-1",
      sourceOutput: "value",
      targetInput: "variable",
    },
  ],
};
