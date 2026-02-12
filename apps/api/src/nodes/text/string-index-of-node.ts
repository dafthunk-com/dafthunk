import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class StringIndexOfNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-index-of",
    name: "Index Of",
    type: "string-index-of",
    description: "Find the index of a substring within a string",
    tags: ["Text", "Query", "IndexOf"],
    icon: "search",
    documentation:
      "This node finds the position (index) of a substring within a string, returning the first occurrence or -1 if not found.",
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
          "The index of the substring in the string, or -1 if not found",
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

      const result = haystack.indexOf(needle);

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error finding string index: ${error.message}`
      );
    }
  }
}
