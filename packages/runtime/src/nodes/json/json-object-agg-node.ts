import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * JSON Object Aggregation node implementation that aggregates key-value pairs into a JSON object
 * Inspired by SQLite/PostgreSQL's json_object_agg function
 */
export class JsonObjectAggNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-object-agg",
    name: "JSON Object Aggregate",
    type: "json-object-agg",
    description: "Aggregates key-value pairs into a JSON object",
    tags: ["Data", "JSON", "Aggregate", "Object"],
    icon: "hash",
    documentation:
      "This node aggregates key-value pairs into a JSON object, similar to SQLite/PostgreSQL's json_object_agg function.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "pairs",
        type: "json",
        description:
          "Key-value pairs to aggregate (supports multiple connections). Each pair should be an object with 'key' and 'value' properties, or an array [key, value]",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description: "The aggregated JSON object",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { pairs } = context.inputs;

      // Handle missing input
      if (pairs === null || pairs === undefined) {
        return this.createSuccessResult({
          result: {},
        });
      }

      // Handle single pair input (object or array)
      if (
        !Array.isArray(pairs) ||
        (Array.isArray(pairs) &&
          pairs.length === 2 &&
          typeof pairs[0] === "string")
      ) {
        const result = this.processPair(pairs);
        if (result === null) {
          return this.createErrorResult(
            "Invalid pair format: expected object with 'key' and 'value' properties or array [key, value]"
          );
        }
        return this.createSuccessResult({
          result: { [result.key]: result.value },
        });
      }

      // Handle array of pairs (multiple connections)
      if (Array.isArray(pairs)) {
        const result: Record<string, any> = {};

        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];

          // Skip null/undefined pairs
          if (pair === null || pair === undefined) {
            continue;
          }

          const processedPair = this.processPair(pair);
          if (processedPair === null) {
            return this.createErrorResult(
              `Invalid pair format at position ${i}: expected object with 'key' and 'value' properties or array [key, value]`
            );
          }

          // If key already exists, the later value will overwrite the earlier one
          result[processedPair.key] = processedPair.value;
        }

        return this.createSuccessResult({
          result,
        });
      }

      return this.createErrorResult(
        "Invalid input type: expected pair object/array or array of pairs"
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  private processPair(pair: any): { key: string; value: any } | null {
    // Handle object format: { key: "someKey", value: "someValue" }
    if (typeof pair === "object" && pair !== null && !Array.isArray(pair)) {
      if (pair.key !== undefined) {
        return { key: String(pair.key), value: pair.value };
      }
    }

    // Handle array format: ["key", "value"]
    if (Array.isArray(pair) && pair.length >= 2) {
      return { key: String(pair[0]), value: pair[1] };
    }

    return null;
  }
}
