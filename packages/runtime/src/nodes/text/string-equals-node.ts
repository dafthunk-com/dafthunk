import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class StringEqualsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-equals",
    name: "Equals",
    type: "string-equals",
    description: "Check if two strings are equal",
    tags: ["Text", "Query", "Equals"],
    icon: "equal",
    documentation:
      "This node checks if two strings are equal. The comparison is case-sensitive by default; set 'ignoreCase' to true to compare without regard to case.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "a",
        type: "string",
        description: "The first string",
        required: true,
      },
      {
        name: "b",
        type: "string",
        description: "The second string",
        required: true,
      },
      {
        name: "ignoreCase",
        type: "boolean",
        description: "Compare without regard to letter case",
        required: false,
        value: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "boolean",
        description: "True if the strings are equal, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { a, b, ignoreCase } = context.inputs;

      if (a === null || a === undefined || typeof a !== "string") {
        return this.createErrorResult("Invalid or missing input 'a'");
      }

      if (b === null || b === undefined || typeof b !== "string") {
        return this.createErrorResult("Invalid or missing input 'b'");
      }

      const result =
        ignoreCase === true ? a.toLowerCase() === b.toLowerCase() : a === b;

      return this.createSuccessResult({ result });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error comparing strings: ${error.message}`
      );
    }
  }
}
