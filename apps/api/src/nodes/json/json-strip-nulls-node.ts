import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class JsonStripNullsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-strip-nulls",
    name: "JSON Strip Nulls",
    type: "json-strip-nulls",
    description: "Remove null values from JSON objects and arrays",
    tags: ["Data", "JSON", "Transform", "StripNulls"],
    icon: "filter",
    documentation:
      "This node removes null values from JSON objects and arrays.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "json",
        description: "The JSON value to strip null values from",
        required: true,
      },
      {
        name: "recursive",
        type: "boolean",
        description:
          "Whether to recursively strip nulls from nested objects and arrays (default: true)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description: "The JSON value with null values removed",
      },
      {
        name: "nullsRemoved",
        type: "number",
        description: "Number of null values removed",
        hidden: true,
      },
      {
        name: "success",
        type: "boolean",
        description: "Whether the operation was successful",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value, recursive = true } = context.inputs;

      // Handle null or undefined inputs
      if (value === null || value === undefined) {
        return this.createSuccessResult({
          result: null,
          nullsRemoved: 0,
          success: true,
        });
      }

      const nullsRemoved = { count: 0 };
      const result = recursive
        ? this.stripNullsRecursive(value, nullsRemoved)
        : this.stripNullsShallow(value, nullsRemoved);

      return this.createSuccessResult({
        result,
        nullsRemoved: nullsRemoved.count,
        success: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error stripping null values: ${error.message}`
      );
    }
  }

  private stripNullsShallow(value: any, nullsRemoved: { count: number }): any {
    if (Array.isArray(value)) {
      // For arrays, filter out null values
      const filtered = value.filter((item) => item !== null);
      nullsRemoved.count += value.length - filtered.length;
      return filtered;
    } else if (typeof value === "object" && value !== null) {
      // For objects, remove properties with null values
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (val !== null) {
          result[key] = val;
        } else {
          nullsRemoved.count++;
        }
      }
      return result;
    } else {
      // For primitives, return as is
      return value;
    }
  }

  private stripNullsRecursive(
    value: any,
    nullsRemoved: { count: number }
  ): any {
    if (Array.isArray(value)) {
      // For arrays, filter out null values and recursively process remaining items
      const result: any[] = [];
      for (const item of value) {
        if (item !== null) {
          result.push(this.stripNullsRecursive(item, nullsRemoved));
        } else {
          nullsRemoved.count++;
        }
      }
      return result;
    } else if (typeof value === "object" && value !== null) {
      // For objects, remove properties with null values and recursively process remaining values
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (val !== null) {
          result[key] = this.stripNullsRecursive(val, nullsRemoved);
        } else {
          nullsRemoved.count++;
        }
      }
      return result;
    } else {
      // For primitives, return as is
      return value;
    }
  }
}
