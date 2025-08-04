import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonFlattenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-flatten",
    name: "JSON Flatten",
    type: "json-flatten",
    description:
      "Flatten nested JSON structure into a flat object with dot notation",
    tags: ["JSON"],
    icon: "layers",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "json",
        description: "The JSON value to flatten",
        required: true,
      },
      {
        name: "separator",
        type: "string",
        description: "Separator for nested keys (default: '.')",
        required: false,
      },
      {
        name: "includeArrays",
        type: "boolean",
        description:
          "Whether to include array indices in flattened keys (default: true)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description: "The flattened JSON object",
      },
      {
        name: "keyCount",
        type: "number",
        description: "Number of keys in the flattened object",
        hidden: true,
      },
      {
        name: "success",
        type: "boolean",
        description: "Whether the flattening was successful",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value, separator = ".", includeArrays = true } = context.inputs;

      // Handle null or undefined inputs
      if (value === null || value === undefined) {
        return this.createSuccessResult({
          result: {},
          keyCount: 0,
          success: true,
        });
      }

      // Handle primitive values
      if (typeof value !== "object") {
        return this.createSuccessResult({
          result: { value },
          keyCount: 1,
          success: true,
        });
      }

      // Flatten the JSON structure
      const flattened = this.flattenObject(value, separator, includeArrays);
      const keyCount = Object.keys(flattened).length;

      return this.createSuccessResult({
        result: flattened,
        keyCount,
        success: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error flattening JSON: ${error.message}`);
    }
  }

  private flattenObject(
    obj: any,
    separator: string,
    includeArrays: boolean,
    prefix: string = ""
  ): Record<string, any> {
    const result: Record<string, any> = {};

    if (Array.isArray(obj)) {
      if (includeArrays) {
        // Handle arrays by including indices
        for (let i = 0; i < obj.length; i++) {
          const key = prefix ? `${prefix}${separator}${i}` : `${i}`;
          const value = obj[i];

          if (value !== null && typeof value === "object") {
            Object.assign(
              result,
              this.flattenObject(value, separator, includeArrays, key)
            );
          } else {
            result[key] = value;
          }
        }
      } else {
        // Skip arrays if includeArrays is false
        result[prefix || "value"] = obj;
      }
    } else if (typeof obj === "object" && obj !== null) {
      // Handle objects
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}${separator}${key}` : key;

        if (value !== null && typeof value === "object") {
          Object.assign(
            result,
            this.flattenObject(value, separator, includeArrays, newKey)
          );
        } else {
          result[newKey] = value;
        }
      }
    } else {
      // Handle primitives
      result[prefix || "value"] = obj;
    }

    return result;
  }
}
