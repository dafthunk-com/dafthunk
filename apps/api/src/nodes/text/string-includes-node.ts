import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

export class StringIncludesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-includes",
    name: "Includes",
    type: "string-includes",
    description: "Check if one string includes another string",
    tags: ["Text", "Query", "Includes"],
    icon: "search",
    documentation:
      "This node checks if one string contains another string as a substring, returning true if found and false otherwise.",
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
