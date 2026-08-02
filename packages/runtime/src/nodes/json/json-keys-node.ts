import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { getAtPath, isJsonObject } from "./json-access";

export class JsonKeysNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-keys",
    name: "JSON Keys",
    type: "json-keys",
    description: "Get all keys at a specific JSON path",
    tags: ["Data", "JSON", "Query", "Keys"],
    icon: "key",
    documentation: "This node gets all keys at a specific JSON path.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON value to extract keys from",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description: "Optional JSON path to get keys from (e.g., '$.user')",
        required: false,
      },
    ],
    outputs: [
      {
        name: "keys",
        type: "json",
        description: "Array of keys at the specified path",
      },
      {
        name: "count",
        type: "number",
        description: "Number of keys found",
        hidden: true,
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
      const { json, path = "$" } = context.inputs;

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          keys: [],
          count: 0,
          isValid: false,
        });
      }

      // Get the value at the specified path
      const targetValue = getAtPath(json, path);

      if (targetValue === undefined) {
        return this.createSuccessResult({
          keys: [],
          count: 0,
          isValid: true,
        });
      }

      // Extract keys from the target value
      let keys: string[] = [];

      if (isJsonObject(targetValue)) {
        // For objects, get all keys
        keys = Object.keys(targetValue);
      } else if (Array.isArray(targetValue)) {
        // For arrays, return empty array (arrays don't have keys)
        keys = [];
      } else {
        // For primitives, return empty array
        keys = [];
      }

      return this.createSuccessResult({
        keys,
        count: keys.length,
        isValid: true,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error extracting JSON keys: ${error.message}`
      );
    }
  }
}
