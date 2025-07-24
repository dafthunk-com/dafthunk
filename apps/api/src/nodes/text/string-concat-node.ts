import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class StringConcatNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-concat",
    name: "String Concat",
    type: "string-concat",
    description: "Concatenate two strings together",
    tags: ["Text"],
    icon: "link",
    inputs: [
      {
        name: "a",
        type: "string",
        description: "The first string to concatenate",
        required: true,
      },
      {
        name: "b",
        type: "string",
        description: "The second string to concatenate",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The concatenated string",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { a, b } = context.inputs;

      // Handle invalid string1 input
      if (a === null || a === undefined || typeof a !== "string") {
        return this.createErrorResult("Invalid or missing first string");
      }

      // Handle invalid string2 input
      if (b === null || b === undefined || typeof b !== "string") {
        return this.createErrorResult("Invalid or missing second string");
      }

      const result = a + b;

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error concatenating strings: ${error.message}`
      );
    }
  }
}
