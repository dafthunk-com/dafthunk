import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class JsonRemoveNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-remove",
    name: "JSON Remove",
    type: "json-remove",
    description: "Remove a value at a specific path in JSON",
    tags: ["Data", "JSON", "Modify", "Remove"],
    icon: "trash",
    documentation:
      "This node removes a value at a specific path in a JSON object.",
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
          "JSONPath to the location to remove (e.g., '$.user.name' or '$.items[0]')",
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
        name: "removed",
        type: "boolean",
        description: "Whether a value was actually removed",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path } = context.inputs;

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          result: null,
          success: false,
          removed: false,
        });
      }

      if (path === null || path === undefined || path === "") {
        return this.createSuccessResult({
          result: json,
          success: false,
          removed: false,
        });
      }

      // Deep clone the input JSON to avoid modifying the original
      const result = JSON.parse(JSON.stringify(json));

      // Remove the value at the specified path
      const { success, removed } = this.removeValueAtPath(result, path);

      return this.createSuccessResult({
        result: success ? result : json,
        success,
        removed,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error removing JSON value: ${error.message}`
      );
    }
  }

  private removeValueAtPath(
    obj: any,
    path: string
  ): { success: boolean; removed: boolean } {
    try {
      const pathParts = this.parsePath(path);

      // If path is invalid or empty, return false
      if (pathParts.length === 0) {
        return { success: false, removed: false };
      }

      let current = obj;

      // Navigate to the parent of the target location
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (current === null || current === undefined) {
          return { success: false, removed: false };
        }

        if (typeof part === "string") {
          if (typeof current !== "object" || Array.isArray(current)) {
            return { success: false, removed: false };
          }
          if (!(part in current)) {
            return { success: true, removed: false };
          }
          current = current[part];
        } else if (typeof part === "number") {
          if (!Array.isArray(current)) {
            return { success: false, removed: false };
          }
          const actualIndex = part < 0 ? current.length + part : part;
          if (actualIndex < 0 || actualIndex >= current.length) {
            return { success: true, removed: false };
          }
          current = current[actualIndex];
        }
      }

      // Remove the value at the final path part
      const finalPart = pathParts[pathParts.length - 1];
      if (typeof finalPart === "string") {
        if (typeof current !== "object" || current === null) {
          return { success: false, removed: false };
        }
        if (finalPart in current) {
          delete current[finalPart];
          return { success: true, removed: true };
        } else {
          return { success: true, removed: false };
        }
      } else if (typeof finalPart === "number") {
        if (!Array.isArray(current)) {
          return { success: false, removed: false };
        }
        const actualIndex =
          finalPart < 0 ? current.length + finalPart : finalPart;
        if (actualIndex >= 0 && actualIndex < current.length) {
          current.splice(actualIndex, 1);
          return { success: true, removed: true };
        } else {
          return { success: true, removed: false };
        }
      }

      return { success: false, removed: false };
    } catch {
      return { success: false, removed: false };
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
