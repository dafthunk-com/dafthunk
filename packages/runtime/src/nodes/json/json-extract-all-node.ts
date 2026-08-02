import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { JsonValue, NodeExecution, NodeType } from "@dafthunk/types";
import { getAtPath, hasKey, isJsonArray, readKey } from "./json-access";

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

  private extractAllValues(obj: JsonValue, path: string): JsonValue[] {
    if (!path || path === "$") {
      return [obj];
    }

    const values: JsonValue[] = [];

    // Handle wildcard array access like [*]
    if (path.includes("[*]")) {
      this.extractWithWildcard(obj, path, values);
    } else {
      // Handle specific path
      const value = getAtPath(obj, path);
      if (value !== undefined) {
        values.push(value);
      }
    }

    return values;
  }

  private extractWithWildcard(
    obj: JsonValue,
    path: string,
    values: JsonValue[]
  ): void {
    // Simple wildcard extraction for common patterns
    // Supports $.items[*], $.items[*].name, etc.

    // Handle $.items[*] pattern
    const wildcardMatch = path.match(/^\$\.([^.]+)\[\*\]$/);
    if (wildcardMatch) {
      const [, key] = wildcardMatch;
      const target = readKey(obj, key);
      if (isJsonArray(target)) {
        values.push(...target);
      }
      return;
    }

    // Handle $.items[*].property pattern
    const wildcardPropertyMatch = path.match(/^\$\.([^.]+)\[\*\]\.(.+)$/);
    if (wildcardPropertyMatch) {
      const [, key, property] = wildcardPropertyMatch;
      const target = readKey(obj, key);
      if (isJsonArray(target)) {
        for (const item of target) {
          if (hasKey(item, property)) {
            values.push(readKey(item, property));
          }
        }
      }
      return;
    }

    // Handle nested wildcard patterns
    const nestedWildcardMatch = path.match(/^\$\.([^.]+)\.([^.]+)\[\*\]$/);
    if (nestedWildcardMatch) {
      const [, parentKey, childKey] = nestedWildcardMatch;
      const child = readKey(readKey(obj, parentKey), childKey);
      if (isJsonArray(child)) {
        values.push(...child);
      }
      return;
    }

    // Fallback: try to extract as specific path
    const value = getAtPath(obj, path);
    if (value !== undefined) {
      values.push(value);
    }
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
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error extracting JSON values: ${error.message}`
      );
    }
  }
}
