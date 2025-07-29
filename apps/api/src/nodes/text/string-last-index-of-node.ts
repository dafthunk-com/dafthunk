import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class StringLastIndexOfNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-last-index-of",
    name: "String Last Index Of",
    type: "string-last-index-of",
    description: "Find the last index of a substring within a string",
    tags: ["Text"],
    icon: "search",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "haystack",
        type: "string",
        description: "The string to search in",
        required: true,
      },
      {
        name: "needle",
        type: "string",
        description: "The substring to search for",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description:
          "The last index of the substring in the string, or -1 if not found",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { haystack, needle } = context.inputs;

      // Handle invalid input 'haystack'
      if (
        haystack === null ||
        haystack === undefined ||
        typeof haystack !== "string"
      ) {
        return this.createErrorResult("Invalid or missing search string");
      }

      // Handle invalid input 'needle'
      if (
        needle === null ||
        needle === undefined ||
        typeof needle !== "string"
      ) {
        return this.createErrorResult("Invalid or missing search pattern");
      }

      const result = haystack.lastIndexOf(needle);

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error finding last string index: ${error.message}`
      );
    }
  }
}
