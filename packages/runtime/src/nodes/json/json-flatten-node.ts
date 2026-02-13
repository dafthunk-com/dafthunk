import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class JsonFlattenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-flatten",
    name: "JSON Flatten",
    type: "json-flatten",
    description:
      "Flatten nested JSON structure into a flat object with dot notation",
    tags: ["Data", "JSON", "Transform", "Flatten"],
    icon: "layers",
    documentation:
      "This node flattens nested JSON objects into a single-level object using dot notation for nested keys.",
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
      const { value, separator = ".", includeArrays = false } = context.inputs;

      // Handle null or undefined inputs
      if (value === null || value === undefined) {
        return this.createSuccessResult({
          result: null,
          keyCount: 0,
          success: true,
        });
      }

      // Handle primitive values
      if (typeof value !== "object") {
        return this.createSuccessResult({
          result: value,
          keyCount: 1,
          success: true,
        });
      }

      // Handle top-level arrays explicitly
      if (Array.isArray(value)) {
        if (!includeArrays) {
          return this.createSuccessResult({
            result: value,
            keyCount: Array.isArray(value) ? value.length : 0,
            success: true,
          });
        }
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
        for (let i = 0; i < obj.length; i++) {
          const idxKey = prefix ? `${prefix}[${i}]` : `[${i}]`;
          const valueAtIndex = obj[i];
          if (valueAtIndex !== null && typeof valueAtIndex === "object") {
            Object.assign(
              result,
              this.flattenObject(valueAtIndex, separator, includeArrays, idxKey)
            );
          } else {
            result[idxKey] = valueAtIndex;
          }
        }
      } else {
        if (prefix) {
          result[prefix] = obj;
        }
      }
    } else if (typeof obj === "object" && obj !== null) {
      // Handle objects
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}${separator}${key}` : key;

        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          Object.assign(
            result,
            this.flattenObject(value, separator, includeArrays, newKey)
          );
        } else {
          if (Array.isArray(value)) {
            if (includeArrays) {
              Object.assign(
                result,
                this.flattenObject(value, separator, includeArrays, newKey)
              );
            } else {
              result[newKey] = value;
            }
          } else {
            result[newKey] = value;
          }
        }
      }
    } else {
      // Handle primitives
      if (prefix) {
        result[prefix] = obj;
      }
    }

    return result;
  }
}
