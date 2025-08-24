import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * ToString node implementation
 * This node converts various input types to their string representation.
 */
export class ToStringNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "to-string",
    name: "To String",
    type: "to-string",
    description: "Converts any input value to its string representation",
    tags: ["Text"],
    icon: "text",
    documentation: `This node converts any input value to its string representation.

## Usage Example

- **Input**: \`{ "name": "John", "age": 30 }\`
- **Output**: \`'{"name":"John","age":30}'\``,
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "any",
        description: "Value to convert to string (accepts any type)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The string representation of the input value",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;
      let result: string;

      // Handle null and undefined
      if (value === null) {
        result = "null";
      } else if (value === undefined) {
        result = "undefined";
      }
      // Handle string (pass through)
      else if (typeof value === "string") {
        result = value;
      }
      // Handle number
      else if (typeof value === "number") {
        result = value.toString();
      }
      // Handle boolean
      else if (typeof value === "boolean") {
        result = value.toString();
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        try {
          result = JSON.stringify(value);
        } catch {
          result = value.toString();
        }
      }
      // Handle objects (including JSON)
      else if (typeof value === "object") {
        try {
          result = JSON.stringify(value);
        } catch {
          result = value.toString();
        }
      }
      // Handle everything else
      else {
        result = String(value);
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
