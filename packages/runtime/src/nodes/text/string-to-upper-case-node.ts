import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class StringToUpperCaseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-to-upper-case",
    name: "To Upper Case",
    type: "string-to-upper-case",
    description: "Convert a string to uppercase",
    tags: ["Text", "Transform", "UpperCase"],
    icon: "text",
    documentation: "This node converts any string to uppercase letters.",
    inlinable: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to convert to uppercase",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The uppercase string",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { string } = context.inputs;

      // Handle invalid input 'string'
      if (
        string === null ||
        string === undefined ||
        typeof string !== "string"
      ) {
        return this.createErrorResult("Invalid or missing input string");
      }

      const result = string.toUpperCase();

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error converting string to uppercase: ${error.message}`
      );
    }
  }
}
