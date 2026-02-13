import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

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

  private getValueAtPath(obj: any, path: string): any {
    if (!path || path === "$") {
      return obj;
    }

    // Simple path resolution for common cases
    // Supports $.key, $.array[index], $.nested.key
    const pathParts = path.replace(/^\$\.?/, "").split(".");
    let current = obj;

    for (const part of pathParts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array access like [0], [1], etc.
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        if (current[key] && Array.isArray(current[key])) {
          const arrayIndex = parseInt(index);
          if (arrayIndex < 0 || arrayIndex >= current[key].length) {
            return undefined;
          }
          current = current[key][arrayIndex];
        } else {
          return undefined;
        }
      } else {
        if (!(part in current)) {
          return undefined;
        }
        current = current[part];
      }
    }

    return current;
  }

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
      const targetValue = this.getValueAtPath(json, path);

      if (targetValue === undefined) {
        return this.createSuccessResult({
          keys: [],
          count: 0,
          isValid: true,
        });
      }

      // Extract keys from the target value
      let keys: string[] = [];

      if (typeof targetValue === "object" && !Array.isArray(targetValue)) {
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
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting JSON keys: ${error.message}`
      );
    }
  }
}
