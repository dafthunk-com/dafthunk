import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

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
          current = current[key][parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }

    if (a === null || b === null || a === undefined || b === undefined) {
      return a === b;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) {
        return false;
      }

      if (Array.isArray(a)) {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (!this.deepEqual(a[i], b[i])) {
            return false;
          }
        }
        return true;
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) {
        return false;
      }

      for (const key of keysA) {
        if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

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
      const targetValue = this.getValueAtPath(json, path);

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
        contains = targetValue.some((item) => this.deepEqual(item, value));
      } else if (typeof targetValue === "object") {
        // For objects, check if the value is a property
        contains = this.deepEqual(targetValue, value);
      } else {
        // For primitives, do direct comparison
        contains = this.deepEqual(targetValue, value);
      }

      return this.createSuccessResult({
        contains,
        isValid: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking JSON contains: ${error.message}`
      );
    }
  }
}
