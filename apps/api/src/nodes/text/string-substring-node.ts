import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class StringSubstringNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-substring",
    name: "Substring",
    type: "string-substring",
    description:
      "Extract a substring from a string using start index (inclusive) and end index (exclusive)",
    tags: ["Text", "Transform", "Substring"],
    icon: "scissors",
    documentation:
      "This node extracts a substring from a string using start and end indices, returning the characters between the specified positions.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "haystack",
        type: "string",
        description: "The string to extract from",
        required: true,
      },
      {
        name: "start",
        type: "number",
        description: "The index to start extraction from (0-based, inclusive)",
        required: true,
      },
      {
        name: "end",
        type: "number",
        description: "The index to end extraction at (0-based, exclusive)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description:
          "The extracted substring (from start index up to, but not including, end index)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { haystack, start, end } = context.inputs;

      // Handle invalid input 'haystack'
      if (
        haystack === null ||
        haystack === undefined ||
        typeof haystack !== "string"
      ) {
        return this.createErrorResult("Invalid or missing input string");
      }

      // Handle invalid input 'start'
      if (
        start === null ||
        start === undefined ||
        typeof start !== "number" ||
        !Number.isInteger(start)
      ) {
        return this.createErrorResult("Invalid or missing start index");
      }

      // Handle invalid input 'end'
      if (
        end === null ||
        end === undefined ||
        typeof end !== "number" ||
        !Number.isInteger(end) ||
        end < 0
      ) {
        return this.createErrorResult("Invalid or missing end index");
      }

      // Handle out of bounds start index
      if (start < 0 || start > haystack.length) {
        return this.createErrorResult("Start index is out of bounds");
      }

      const result = haystack.substring(start, end);

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting substring: ${error.message}`
      );
    }
  }
}
