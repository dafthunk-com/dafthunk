import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class StringConcatNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-concat",
    name: "Concat",
    type: "string-concat",
    description: "Concatenate multiple strings together",
    tags: ["Text"],
    icon: "link",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "strings",
        type: "string",
        description:
          "String inputs to concatenate (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The concatenated string",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { strings } = context.inputs;

      // Handle missing input
      if (strings === null || strings === undefined) {
        return this.createErrorResult("No string inputs provided");
      }

      // Handle single string input
      if (typeof strings === "string") {
        return this.createSuccessResult({
          result: strings,
        });
      }

      // Handle array of strings (multiple connections)
      if (Array.isArray(strings)) {
        // Validate all inputs are strings
        for (let i = 0; i < strings.length; i++) {
          if (typeof strings[i] !== "string") {
            return this.createErrorResult(
              `Invalid input at position ${i}: expected string, got ${typeof strings[i]}`
            );
          }
        }

        const result = strings.join("");

        return this.createSuccessResult({
          result,
        });
      }

      return this.createErrorResult(
        "Invalid input type: expected string or array of strings"
      );
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error concatenating strings: ${error.message}`
      );
    }
  }
}
