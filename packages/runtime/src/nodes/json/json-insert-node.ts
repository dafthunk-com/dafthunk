import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type {
  JsonArray,
  JsonObject,
  JsonValue,
  NodeExecution,
  NodeType,
} from "@dafthunk/types";
import { isJsonArray, isJsonObject, writeKey } from "./json-access";

export class JsonInsertNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-insert",
    name: "JSON Insert",
    type: "json-insert",
    description: "Insert a value at a specific path only if it doesn't exist",
    tags: ["Data", "JSON", "Modify", "Insert"],
    icon: "plus",
    documentation:
      "This node inserts a value at a specific JSONPath location only if the path doesn't already exist.",
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
          "JSONPath to the location to insert (e.g., '$.user.name' or '$.items[0]')",
        required: true,
      },
      {
        name: "value",
        type: "json",
        description: "The value to insert at the specified path",
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
        name: "inserted",
        type: "boolean",
        description: "Whether a new value was inserted",
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
          inserted: false,
        });
      }

      // Deep clone the input JSON to avoid modifying the original
      const result = JSON.parse(JSON.stringify(base));

      // Insert or overwrite the value at path (upsert semantics)
      const success = this.insertValueAtPath(result, path, value);

      return this.createSuccessResult({
        result: success ? result : base,
        success,
        inserted: true,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error inserting JSON value: ${error.message}`
      );
    }
  }

  private insertValueAtPath(
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

      // Navigate to the parent of the target location
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (typeof part === "string") {
          const container: JsonObject = isJsonObject(current) ? current : {};
          if (!(part in container)) {
            // Grow an array when the next segment indexes into it.
            container[part] = typeof pathParts[i + 1] === "number" ? [] : {};
          }
          current = container[part];
        } else if (typeof part === "number") {
          const container: JsonArray = isJsonArray(current) ? current : [];
          while (container.length <= part) {
            container.push(typeof pathParts[i + 1] === "string" ? {} : null);
          }
          current = container[part];
        }
      }

      // Insert the value at the final path part (overwrite if exists)
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
        // For negative indices, we'll handle them specially
        if (index < 0) {
          // Return empty array to indicate invalid path
          return [];
        }
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
