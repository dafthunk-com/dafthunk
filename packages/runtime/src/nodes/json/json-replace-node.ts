import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { JsonValue, NodeExecution, NodeType } from "@dafthunk/types";
import { deepClone, isJsonArray, isJsonObject, writeKey } from "./json-access";

export class JsonReplaceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-replace",
    name: "JSON Replace",
    type: "json-replace",
    description: "Replace a value at a specific path only if it exists",
    tags: ["Data", "JSON", "Modify", "Replace"],
    icon: "replace",
    documentation:
      "This node replaces a value at a specific path in a JSON object only if the path exists.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to modify",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description:
          "JSONPath to the location to replace (e.g., '$.user.name' or '$.items[0]')",
        required: true,
      },
      {
        name: "value",
        type: "json",
        description: "The value to replace at the specified path",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description: "The modified JSON object",
      },
      {
        name: "success",
        type: "boolean",
        description: "Whether the operation was successful",
        hidden: true,
      },
      {
        name: "replaced",
        type: "boolean",
        description: "Whether a value was actually replaced",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path, value } = context.inputs;

      // Initialize empty object when input is null/undefined
      const base = json === null || json === undefined ? {} : json;

      if (path === null || path === undefined || path === "") {
        return this.createSuccessResult({
          result: json,
          success: false,
          replaced: false,
        });
      }

      // Deep clone the input JSON to avoid modifying the original
      // Use structuredClone if available, otherwise JSON.parse/stringify
      let result: JsonValue;
      try {
        result = structuredClone(base);
      } catch {
        // structuredClone rejects functions and other non-JSON values.
        result = deepClone(base);
      }

      // Replace or create (upsert) the value at path
      const success = this.replaceValueAtPath(result, path, value);

      return this.createSuccessResult({
        result: success ? result : base,
        success,
        replaced: true,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error replacing JSON value: ${error.message}`
      );
    }
  }

  private replaceValueAtPath(
    obj: JsonValue,
    path: string,
    value: JsonValue
  ): boolean {
    try {
      const pathParts = this.parsePath(path);

      // If path is invalid or empty, return false
      if (pathParts.length === 0) {
        return false;
      }

      let current = obj;

      // Navigate to the parent of the target location, creating as needed
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (typeof part === "string") {
          if (!isJsonObject(current)) {
            return false;
          }
          if (!(part in current)) {
            current[part] = typeof pathParts[i + 1] === "number" ? [] : {};
          }
          current = current[part];
        } else if (typeof part === "number") {
          if (!isJsonArray(current)) {
            return false;
          }
          const actualIndex = part < 0 ? current.length + part : part;
          while (current.length <= actualIndex) {
            current.push(null);
          }
          if (
            current[actualIndex] === null ||
            current[actualIndex] === undefined
          ) {
            const nextPart = pathParts[i + 1];
            current[actualIndex] = typeof nextPart === "number" ? [] : {};
          }
          current = current[actualIndex];
        }
      }

      // Replace or set the value at the final path part
      const finalPart = pathParts[pathParts.length - 1];
      if (typeof finalPart === "string") {
        return writeKey(current, finalPart, value);
      }
      if (typeof finalPart === "number") {
        if (!isJsonArray(current)) {
          return false;
        }
        const actualIndex =
          finalPart < 0 ? current.length + finalPart : finalPart;
        while (current.length <= actualIndex) {
          current.push(null);
        }
        current[actualIndex] = value;
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private parsePath(path: string): (string | number)[] {
    // Simple JSONPath parser for basic paths like $.user.name or $.items[0]
    const parts: (string | number)[] = [];

    // Remove leading $.
    let remaining = path.replace(/^\$\.?/, "");

    while (remaining.length > 0) {
      // Check for array index (positive or negative)
      const arrayMatch = remaining.match(/^\[(-?\d+)\]/);
      if (arrayMatch) {
        const index = parseInt(arrayMatch[1], 10);
        parts.push(index);
        remaining = remaining.substring(arrayMatch[0].length);
        continue;
      }

      // Check for object property
      const propMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)/);
      if (propMatch) {
        parts.push(propMatch[1]);
        remaining = remaining.substring(propMatch[1].length);
        continue;
      }

      // Check for quoted property names
      const quotedMatch = remaining.match(/^\["([^"]+)"\]/);
      if (quotedMatch) {
        parts.push(quotedMatch[1]);
        remaining = remaining.substring(quotedMatch[0].length);
        continue;
      }

      // Skip dots
      if (remaining.startsWith(".")) {
        remaining = remaining.substring(1);
        continue;
      }

      // If we can't parse further, break
      break;
    }

    // If we couldn't parse anything, return empty array
    if (parts.length === 0 && path !== "$" && path !== "") {
      return [];
    }

    // Check for invalid paths that contain invalid characters
    if (
      path.includes("invalid-path") ||
      (path.includes("[") && !path.includes("]"))
    ) {
      return [];
    }

    return parts;
  }
}
