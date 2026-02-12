import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class StringTrimNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-trim",
    name: "Trim",
    type: "string-trim",
    description: "Remove whitespace from both ends of a string",
    tags: ["Text", "Transform", "Trim"],
    icon: "scissors",
    documentation:
      "This node removes whitespace characters (spaces, tabs, newlines) from both the beginning and end of a string.",
    inlinable: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to trim",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The trimmed string",
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

      const result = string.trim();

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error trimming string: ${error.message}`);
    }
  }
}
