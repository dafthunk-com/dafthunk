import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class StringIncludesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-includes",
    name: "String Includes",
    type: "string-includes",
    description: "Check if one string includes another string",
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
        description: "The string to search for",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "boolean",
        description:
          "True if string 'haystack' includes string 'needle', false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { haystack, needle } = context.inputs;

      // Handle invalid input 'a'
      if (
        haystack === null ||
        haystack === undefined ||
        typeof haystack !== "string"
      ) {
        return this.createErrorResult("Invalid or missing search string");
      }

      // Handle invalid input 'b'
      if (
        needle === null ||
        needle === undefined ||
        typeof needle !== "string"
      ) {
        return this.createErrorResult("Invalid or missing search pattern");
      }

      const result = haystack.includes(needle);

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking string containment: ${error.message}`
      );
    }
  }
}
