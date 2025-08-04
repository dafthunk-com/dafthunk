import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonContainsPathNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-contains-path",
    name: "JSON Contains Path",
    type: "json-contains-path",
    description: "Check if JSON contains a specific path",
    tags: ["JSON"],
    icon: "map-pin",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON value to check",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description: "The JSON path to check for (e.g., '$.items[0].name')",
        required: true,
      },
    ],
    outputs: [
      {
        name: "containsPath",
        type: "boolean",
        description: "Whether the JSON contains the specified path",
      },
      {
        name: "isValid",
        type: "boolean",
        description: "Whether the input was valid JSON",
        hidden: true,
      },
    ],
  };

  private pathExists(obj: any, path: string): boolean {
    if (!path || path === "$") {
      return obj !== null && obj !== undefined;
    }

    // Simple path resolution for common cases
    // Supports $.key, $.array[index], $.nested.key
    const pathParts = path.replace(/^\$\.?/, "").split(".");
    let current = obj;

    for (const part of pathParts) {
      if (current === null || current === undefined) {
        return false;
      }

      // Handle array access like [0], [1], etc.
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        if (current[key] && Array.isArray(current[key])) {
          const arrayIndex = parseInt(index);
          if (arrayIndex < 0 || arrayIndex >= current[key].length) {
            return false;
          }
          current = current[key][arrayIndex];
        } else {
          return false;
        }
      } else {
        if (!(part in current)) {
          return false;
        }
        current = current[part];
      }
    }

    return true;
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path } = context.inputs;

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          containsPath: false,
          isValid: false,
        });
      }

      if (!path || typeof path !== "string") {
        return this.createSuccessResult({
          containsPath: false,
          isValid: true,
        });
      }

      // Check if the path exists in the JSON
      const containsPath = this.pathExists(json, path);

      return this.createSuccessResult({
        containsPath,
        isValid: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking JSON contains path: ${error.message}`
      );
    }
  }
}
