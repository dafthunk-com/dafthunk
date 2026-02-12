import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class StringToLowerCaseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-to-lower-case",
    name: "To Lower Case",
    type: "string-to-lower-case",
    description: "Convert a string to lowercase",
    tags: ["Text", "Transform", "LowerCase"],
    icon: "text",
    documentation: "This node converts any string to lowercase letters.",
    inlinable: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to convert to lowercase",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The lowercase string",
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

      const result = string.toLowerCase();

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error converting string to lowercase: ${error.message}`
      );
    }
  }
}
