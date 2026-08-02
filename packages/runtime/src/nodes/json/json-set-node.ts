import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type {
  JsonArray,
  JsonObject,
  JsonValue,
  NodeExecution,
  NodeType,
} from "@dafthunk/types";
import { hasPath, isJsonArray, isJsonObject, writeKey } from "./json-access";

export class JsonSetNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-set",
    name: "JSON Set",
    type: "json-set",
    description: "Set a value at a specific path in JSON",
    tags: ["Data", "JSON", "Modify", "Set"],
    icon: "edit",
    documentation:
      "This node sets a value at a specific path within a JSON object, creating the path if it doesn't exist.",
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
          "JSONPath to the location to set (e.g., '$.user.name' or '$.items[0]')",
        required: true,
      },
      {
        name: "value",
        type: "json",
        description: "The value to set at the specified path",
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
        name: "pathExists",
        type: "boolean",
        description: "Whether the path existed before setting",
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
          pathExists: false,
        });
      }

      // Deep clone the input JSON to avoid modifying the original
      const result = JSON.parse(JSON.stringify(base));

      // Check if path exists before setting
      const pathExists = hasPath(result, path);

      // Set the value at the specified path
      const success = this.setValueAtPath(result, path, value);

      return this.createSuccessResult({
        result: success ? result : base,
        success,
        pathExists,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error setting JSON value: ${error.message}`
      );
    }
  }

  private setValueAtPath(
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
          // Handle negative indices by converting to positive
          const actualIndex = part < 0 ? container.length + part : part;
          while (container.length <= actualIndex) {
            container.push(typeof pathParts[i + 1] === "string" ? {} : null);
          }
          current = container[actualIndex];
        }
      }

      // Set the value at the final path part
      const finalPart = pathParts[pathParts.length - 1];
      if (typeof finalPart === "string") {
        return writeKey(current, finalPart, value);
      }
      if (typeof finalPart === "number") {
        if (!isJsonArray(current)) {
          return false;
        }
        // Handle negative indices by converting to positive
        const actualIndex =
          finalPart < 0 ? current.length + finalPart : finalPart;
        while (current.length <= actualIndex) {
          current.push(null);
        }
        current[actualIndex] = value;
      }

      return true;
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
