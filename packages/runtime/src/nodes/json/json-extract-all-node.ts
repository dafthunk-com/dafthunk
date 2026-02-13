import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class JsonExtractAllNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-extract-all",
    name: "JSON Extract All",
    type: "json-extract-all",
    description: "Extract all values matching a JSON path (not just first)",
    tags: ["Data", "JSON", "Extract"],
    icon: "list",
    documentation:
      "This node extracts all values matching a JSON path (not just the first match).",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON value to extract from",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description: "The JSON path to extract (e.g., '$.items[*].name')",
        required: true,
      },
    ],
    outputs: [
      {
        name: "values",
        type: "json",
        description: "Array of all values matching the path",
      },
      {
        name: "count",
        type: "number",
        description: "Number of values extracted",
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

  private extractAllValues(obj: any, path: string): any[] {
    if (!path || path === "$") {
      return [obj];
    }

    const values: any[] = [];

    // Handle wildcard array access like [*]
    if (path.includes("[*]")) {
      this.extractWithWildcard(obj, path, values);
    } else {
      // Handle specific path
      const value = this.getValueAtPath(obj, path);
      if (value !== undefined) {
        values.push(value);
      }
    }

    return values;
  }

  private extractWithWildcard(obj: any, path: string, values: any[]): void {
    // Simple wildcard extraction for common patterns
    // Supports $.items[*], $.items[*].name, etc.

    // Handle $.items[*] pattern
    const wildcardMatch = path.match(/^\$\.([^.]+)\[\*\]$/);
    if (wildcardMatch) {
      const [, key] = wildcardMatch;
      if (obj[key] && Array.isArray(obj[key])) {
        values.push(...obj[key]);
      }
      return;
    }

    // Handle $.items[*].property pattern
    const wildcardPropertyMatch = path.match(/^\$\.([^.]+)\[\*\]\.(.+)$/);
    if (wildcardPropertyMatch) {
      const [, key, property] = wildcardPropertyMatch;
      if (obj[key] && Array.isArray(obj[key])) {
        for (const item of obj[key]) {
          if (item && typeof item === "object" && property in item) {
            values.push(item[property]);
          }
        }
      }
      return;
    }

    // Handle nested wildcard patterns
    const nestedWildcardMatch = path.match(/^\$\.([^.]+)\.([^.]+)\[\*\]$/);
    if (nestedWildcardMatch) {
      const [, parentKey, childKey] = nestedWildcardMatch;
      if (
        obj[parentKey] &&
        typeof obj[parentKey] === "object" &&
        obj[parentKey][childKey] &&
        Array.isArray(obj[parentKey][childKey])
      ) {
        values.push(...obj[parentKey][childKey]);
      }
      return;
    }

    // Fallback: try to extract as specific path
    const value = this.getValueAtPath(obj, path);
    if (value !== undefined) {
      values.push(value);
    }
  }

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
      const { json, path } = context.inputs;

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          values: [],
          count: 0,
          isValid: false,
        });
      }

      if (!path || typeof path !== "string") {
        return this.createSuccessResult({
          values: [],
          count: 0,
          isValid: true,
        });
      }

      // Extract all values matching the path
      const values = this.extractAllValues(json, path);

      return this.createSuccessResult({
        values,
        count: values.length,
        isValid: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting JSON values: ${error.message}`
      );
    }
  }
}
