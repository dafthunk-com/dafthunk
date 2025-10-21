import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonArrayLengthNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-array-length",
    name: "JSON Array Length",
    type: "json-array-length",
    description: "Get the length of a JSON array",
    tags: ["Data", "JSON", "Array", "Length"],
    icon: "hash",
    documentation: "This node gets the length of a JSON array.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "array",
        type: "json",
        description: "The JSON array to get the length of",
        required: true,
      },
    ],
    outputs: [
      {
        name: "length",
        type: "number",
        description: "The length of the array",
      },
      {
        name: "isArray",
        type: "boolean",
        description: "Whether the input was a valid array",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { array } = context.inputs;

      // Handle null or undefined input
      if (array === null || array === undefined) {
        return this.createSuccessResult({
          length: 0,
          isArray: false,
        });
      }

      // Check if input is an array
      if (!Array.isArray(array)) {
        return this.createSuccessResult({
          length: 0,
          isArray: false,
        });
      }

      return this.createSuccessResult({
        length: array.length,
        isArray: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error getting array length: ${error.message}`
      );
    }
  }
}
