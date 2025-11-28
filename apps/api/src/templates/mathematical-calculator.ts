import type { WorkflowTemplate } from "@dafthunk/types";

import { AdditionNode } from "../nodes/math/addition-node";
import { MultiplicationNode } from "../nodes/math/multiplication-node";
import { NumberInputNode } from "../nodes/math/number-input-node";

export const mathematicalCalculatorTemplate: WorkflowTemplate = {
  id: "mathematical-calculator",
  name: "Mathematical Calculator",
  description: "Perform mathematical operations with multiple inputs",
  category: "data-processing",
  type: "manual",
  tags: ["math", "calculation", "numbers"],
  nodes: [
    NumberInputNode.create({
      id: "number-1",
      position: { x: 100, y: 100 },
      description: "Enter first number",
      inputs: { placeholder: "Enter first number" },
    }),
    NumberInputNode.create({
      id: "number-2",
      position: { x: 100, y: 300 },
      description: "Enter second number",
      inputs: { placeholder: "Enter second number" },
    }),
    AdditionNode.create({
      id: "addition-1",
      position: { x: 500, y: 100 },
      description: "Add the two numbers",
    }),
    MultiplicationNode.create({
      id: "multiplication-1",
      position: { x: 500, y: 300 },
      description: "Multiply the two numbers",
    }),
  ],
  edges: [
    {
      source: "number-1",
      target: "addition-1",
      sourceOutput: "value",
      targetInput: "a",
    },
    {
      source: "number-2",
      target: "addition-1",
      sourceOutput: "value",
      targetInput: "b",
    },
    {
      source: "number-1",
      target: "multiplication-1",
      sourceOutput: "value",
      targetInput: "a",
    },
    {
      source: "number-2",
      target: "multiplication-1",
      sourceOutput: "value",
      targetInput: "b",
    },
  ],
};
