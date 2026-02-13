import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * JSON Aggregation node implementation that aggregates values into a JSON array
 * Inspired by SQLite/PostgreSQL's json_agg function
 */
export class JsonAggNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-agg",
    name: "JSON Aggregate",
    type: "json-agg",
    description: "Aggregates multiple values into a JSON array",
    tags: ["Data", "JSON", "Aggregate"],
    icon: "list",
    documentation: "This node aggregates multiple values into a JSON array.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "values",
        type: "any",
        description:
          "Values to aggregate into a JSON array (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description: "The aggregated JSON array",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { values } = context.inputs;

      // Handle missing input
      if (values === null || values === undefined) {
        return this.createSuccessResult({
          result: [],
        });
      }

      // Handle single value input
      if (!Array.isArray(values)) {
        return this.createSuccessResult({
          result: [values],
        });
      }

      // Handle array of values (multiple connections)
      if (Array.isArray(values)) {
        // Filter out null/undefined values and create the result array
        const result = values.filter(
          (value) => value !== null && value !== undefined
        );

        return this.createSuccessResult({
          result,
        });
      }

      return this.createErrorResult(
        "Invalid input type: expected any value or array of values"
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
