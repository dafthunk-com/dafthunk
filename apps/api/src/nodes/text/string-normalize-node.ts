import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class StringNormalizeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-normalize",
    name: "Normalize",
    type: "string-normalize",
    description: "Normalize a string using the Unicode Normalization forms",
    tags: ["Text", "Transform", "Normalize"],
    icon: "text",
    documentation:
      "This node normalizes a string using Unicode Normalization Form C (NFC), which combines characters and diacritical marks into their canonical form.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "The string to normalize",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The normalized string",
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

      const result = string.normalize();

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error normalizing string: ${error.message}`
      );
    }
  }
}
