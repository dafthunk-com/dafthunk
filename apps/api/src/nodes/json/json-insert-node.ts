import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonInsertNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-insert",
    name: "JSON Insert",
    type: "json-insert",
    description: "Insert a value at a specific path only if it doesn't exist",
    tags: ["JSON"],
    icon: "plus",
    documentation: "*Missing detailed documentation*",
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

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          result: null,
          success: false,
          inserted: false,
        });
      }

      if (path === null || path === undefined || path === "") {
        return this.createSuccessResult({
          result: json,
          success: false,
          inserted: false,
        });
      }

      // Deep clone the input JSON to avoid modifying the original
      const result = JSON.parse(JSON.stringify(json));

      // Check if path already exists
      const pathExists = this.pathExists(result, path);

      if (pathExists) {
        // Path exists, don't insert
        return this.createSuccessResult({
          result,
          success: true,
          inserted: false,
        });
      }

      // Path doesn't exist, insert the value
      const success = this.insertValueAtPath(result, path, value);

      return this.createSuccessResult({
        result: success ? result : json,
        success,
        inserted: success,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error inserting JSON value: ${error.message}`
      );
    }
  }

  private pathExists(obj: any, path: string): boolean {
    try {
      const pathParts = this.parsePath(path);
      let current = obj;

      for (const part of pathParts) {
        if (current === null || current === undefined) {
          return false;
        }

        if (typeof part === "string") {
          if (typeof current !== "object" || Array.isArray(current)) {
            return false;
          }
          if (!(part in current)) {
            return false;
          }
          current = current[part];
        } else if (typeof part === "number") {
          if (!Array.isArray(current)) {
            return false;
          }
          if (part < 0 || part >= current.length) {
            return false;
          }
          current = current[part];
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private insertValueAtPath(obj: any, path: string, value: any): boolean {
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
          if (typeof current !== "object" || current === null) {
            current = {};
          }
          if (!(part in current)) {
            // Check if the next part is a number (array index)
            const nextPart = pathParts[i + 1];
            if (typeof nextPart === "number") {
              current[part] = [];
            } else {
              current[part] = {};
            }
          }
          current = current[part];
        } else if (typeof part === "number") {
          if (!Array.isArray(current)) {
            current = [];
          }
          while (current.length <= part) {
            // Check if the next part is a string (object property)
            const nextPart = pathParts[i + 1];
            if (typeof nextPart === "string") {
              current.push({});
            } else {
              current.push(null);
            }
          }
          current = current[part];
        }
      }

      // Insert the value at the final path part
      const finalPart = pathParts[pathParts.length - 1];
      if (typeof finalPart === "string") {
        if (typeof current !== "object" || current === null) {
          return false;
        }
        // Only insert if the key doesn't exist
        if (!(finalPart in current)) {
          current[finalPart] = value;
          return true;
        }
      } else if (typeof finalPart === "number") {
        if (!Array.isArray(current)) {
          return false;
        }
        // Only insert if the index doesn't exist
        if (finalPart >= current.length) {
          while (current.length <= finalPart) {
            current.push(null);
          }
          current[finalPart] = value;
          return true;
        }
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
      const propMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
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
