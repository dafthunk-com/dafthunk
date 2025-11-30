import type { WorkflowTemplate } from "@dafthunk/types";

import { BooleanInputNode } from "../nodes/input/boolean-input-node";
import { NumberInputNode } from "../nodes/input/number-input-node";
import { ConditionalForkNode } from "../nodes/logic/conditional-fork-node";
import { ConditionalJoinNode } from "../nodes/logic/conditional-join-node";
import { AdditionNode } from "../nodes/math/addition-node";
import { SubtractionNode } from "../nodes/math/subtraction-node";
import { NumberPreviewNode } from "../nodes/preview/number-preview-node";

export const coinFlipTemplate: WorkflowTemplate = {
  id: "conditional-branching",
  name: "Conditional Branching",
  description: "Demonstrate conditional branching with fork and join",
  icon: "git-branch",
  type: "manual",
  tags: ["logic", "demo", "conditional"],
  nodes: [
    BooleanInputNode.create({
      id: "condition",
      name: "Add?",
      position: { x: 100, y: 200 },
      inputs: {
        value: true,
      },
    }),
    NumberInputNode.create({
      id: "input",
      name: "Input",
      position: { x: 100, y: 350 },
      inputs: {
        value: 10,
      },
    }),
    ConditionalForkNode.create({
      id: "fork",
      name: "Fork",
      position: { x: 400, y: 250 },
    }),
    AdditionNode.create({
      id: "add",
      name: "+ 5",
      position: { x: 700, y: 150 },
      inputs: {
        b: 5,
      },
    }),
    SubtractionNode.create({
      id: "subtract",
      name: "- 5",
      position: { x: 700, y: 400 },
      inputs: {
        b: 5,
      },
    }),
    ConditionalJoinNode.create({
      id: "join",
      name: "Join",
      position: { x: 1000, y: 250 },
    }),
    NumberPreviewNode.create({
      id: "result",
      name: "Result",
      position: { x: 1300, y: 250 },
    }),
  ],
  edges: [
    {
      source: "condition",
      target: "fork",
      sourceOutput: "value",
      targetInput: "condition",
    },
    {
      source: "input",
      target: "fork",
      sourceOutput: "value",
      targetInput: "value",
    },
    {
      source: "fork",
      target: "add",
      sourceOutput: "true",
      targetInput: "a",
    },
    {
      source: "fork",
      target: "subtract",
      sourceOutput: "false",
      targetInput: "a",
    },
    {
      source: "add",
      target: "join",
      sourceOutput: "result",
      targetInput: "a",
    },
    {
      source: "subtract",
      target: "join",
      sourceOutput: "result",
      targetInput: "b",
    },
    {
      source: "join",
      target: "result",
      sourceOutput: "result",
      targetInput: "value",
    },
  ],
};
