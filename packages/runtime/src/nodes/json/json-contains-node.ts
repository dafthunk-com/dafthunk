import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { deepEqual, getAtPath } from "./json-access";

export class JsonContainsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-contains",
    name: "JSON Contains",
    type: "json-contains",
    description: "Check if JSON contains another JSON value",
    tags: ["Data", "JSON", "Query", "Contains"],
    icon: "search",
    documentation:
      "This node checks if a JSON value contains another JSON value, supporting deep comparison and optional path-based searching.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON value to search in",
        required: true,
      },
      {
        name: "value",
        type: "json",
        description: "The JSON value to search for",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description: "Optional JSON path to search within (e.g., '$.items')",
        required: false,
      },
    ],
    outputs: [
      {
        name: "contains",
        type: "boolean",
        description: "Whether the JSON contains the specified value",
      },
      {
        name: "isValid",
        type: "boolean",
        description: "Whether the input was valid JSON",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, value, path = "$" } = context.inputs;

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          contains: false,
          isValid: false,
        });
      }

      if (value === null || value === undefined) {
        return this.createSuccessResult({
          contains: false,
          isValid: true,
        });
      }

      // Get the value at the specified path
      const targetValue = getAtPath(json, path);

      if (targetValue === undefined) {
        return this.createSuccessResult({
          contains: false,
          isValid: true,
        });
      }

      // Check if the target value contains the search value
      let contains = false;

      if (Array.isArray(targetValue)) {
        // For arrays, check if any element matches
        contains = targetValue.some((item) => deepEqual(item, value));
      } else if (typeof targetValue === "object") {
        // For objects, check if the value is a property
        contains = deepEqual(targetValue, value);
      } else {
        // For primitives, do direct comparison
        contains = deepEqual(targetValue, value);
      }

      return this.createSuccessResult({
        contains,
        isValid: true,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error checking JSON contains: ${error.message}`
      );
    }
  }
}
