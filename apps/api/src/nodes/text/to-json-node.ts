import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * ToJSON node implementation
 * This node converts various input types to their JSON representation.
 */
export class ToJsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "to-json",
    name: "To JSON",
    type: "to-json",
    description: "Converts any input value to its JSON representation",
    tags: ["Data", "Convert", "JSON"],
    icon: "code",
    documentation:
      "This node converts any input value to its JSON representation.",
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "any",
        description: "Value to convert to JSON (accepts any type)",
        required: true,
      },
      {
        name: "prettyPrint",
        type: "boolean",
        description: "Format JSON with indentation for readability",
        required: false,
        value: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The JSON representation of the input value",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value, prettyPrint } = context.inputs;

      if (value === undefined) {
        return this.createErrorResult("Value is required");
      }

      let result: string;

      try {
        if (prettyPrint === true) {
          result = JSON.stringify(value, null, 2);
        } else {
          result = JSON.stringify(value);
        }
      } catch (error) {
        return this.createErrorResult(
          `Unable to convert value to JSON: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      return this.createSuccessResult({
        result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
