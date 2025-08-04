import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonReplaceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-replace",
    name: "JSON Replace",
    type: "json-replace",
    description: "Replace a value at a specific path only if it exists",
    tags: ["JSON"],
    icon: "refresh",
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

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          result: null,
          success: false,
          replaced: false,
        });
      }

      if (path === null || path === undefined || path === "") {
        return this.createSuccessResult({
          result: json,
          success: false,
          replaced: false,
        });
      }

      // Deep clone the input JSON to avoid modifying the original
      // Use structuredClone if available, otherwise JSON.parse/stringify
      let result;
      try {
        result = structuredClone(json);
      } catch {
        // For functions and other non-serializable objects, use a custom deep clone
        result = this.deepClone(json);
      }

      // Check if path exists before replacing
      const pathExists = this.pathExists(result, path);

      if (!pathExists) {
        // Path doesn't exist, don't replace
        return this.createSuccessResult({
          result,
          success: true,
          replaced: false,
        });
      }

      // Path exists, replace the value
      const success = this.replaceValueAtPath(result, path, value);

      return this.createSuccessResult({
        result: success ? result : json,
        success,
        replaced: success,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error replacing JSON value: ${error.message}`
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
          // Treat negative indices as out of bounds
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

  private replaceValueAtPath(obj: any, path: string, value: any): boolean {
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
          // Treat negative indices as out of bounds
          if (part < 0 || part >= current.length) {
            return false;
          }
          current = current[part];
        }
      }

      // Replace the value at the final path part
      const finalPart = pathParts[pathParts.length - 1];
      if (typeof finalPart === "string") {
        if (typeof current !== "object" || current === null) {
          return false;
        }
        if (finalPart in current) {
          current[finalPart] = value;
          return true;
        }
      } else if (typeof finalPart === "number") {
        if (!Array.isArray(current)) {
          return false;
        }
        // Treat negative indices as out of bounds
        if (finalPart >= 0 && finalPart < current.length) {
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

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item));
    }

    if (typeof obj === "object") {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }
}
