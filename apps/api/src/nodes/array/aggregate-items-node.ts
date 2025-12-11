import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Aggregate Items node implementation that collects multiple inputs into a repeated output.
 * This is the inverse of ExtractItemNode - it takes individual values and outputs them as a repeated array.
 */
export class AggregateItemsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "aggregate-items",
    name: "Aggregate Items",
    type: "aggregate-items",
    description: "Collects multiple values into a repeated output array",
    tags: ["Data", "Array", "Aggregate"],
    icon: "list-plus",
    documentation:
      "This node collects multiple input values into a repeated output. It is the inverse of Extract Item - use it to combine individual values into an array that can be processed by nodes expecting repeated inputs.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "values",
        type: "any",
        description: "Values to aggregate (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "any",
        description: "The aggregated values as a repeated output",
        repeated: true,
      },
      {
        name: "count",
        type: "number",
        description: "Number of items in the result",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { values } = context.inputs;

      // Handle missing input - return empty array
      if (values === null || values === undefined) {
        return this.createSuccessResult({
          result: [],
          count: 0,
        });
      }

      // Handle single value input - wrap in array
      if (!Array.isArray(values)) {
        return this.createSuccessResult({
          result: [values],
          count: 1,
        });
      }

      // Handle array of values (multiple connections)
      return this.createSuccessResult({
        result: values,
        count: values.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
