import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * Extract Item node implementation that extracts a single item from a repeated input
 */
export class ExtractItemNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "extract-item",
    name: "Extract Item",
    type: "extract-item",
    description:
      "Extracts a single item from a repeated input at the specified index",
    tags: ["Data", "Array", "Extract"],
    icon: "list-filter",
    documentation:
      "This node extracts a single item from a repeated input (array) at the specified index. Supports negative indices to count from the end (-1 = last item).",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "values",
        type: "any",
        description: "Values to extract from (supports multiple connections)",
        required: true,
        repeated: true,
      },
      {
        name: "index",
        type: "number",
        description:
          "The index of the item to extract (0-based). Negative indices count from the end (-1 = last item).",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "any",
        description: "The extracted item",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { values, index } = context.inputs;

      // Validate index
      if (index === null || index === undefined) {
        return this.createErrorResult("Index is required");
      }

      if (typeof index !== "number" || !Number.isInteger(index)) {
        return this.createErrorResult("Index must be an integer");
      }

      // Handle missing input
      if (values === null || values === undefined) {
        return this.createErrorResult("No values provided to extract from");
      }

      // Convert single value to array for uniform handling
      const valuesArray = Array.isArray(values) ? values : [values];

      // Handle empty array
      if (valuesArray.length === 0) {
        return this.createErrorResult("Cannot extract from empty array");
      }

      // Calculate actual index (support negative indices)
      const actualIndex = index < 0 ? valuesArray.length + index : index;

      // Validate bounds
      if (actualIndex < 0 || actualIndex >= valuesArray.length) {
        return this.createErrorResult(
          `Index ${index} is out of bounds for array of length ${valuesArray.length}`
        );
      }

      const result = valuesArray[actualIndex];

      return this.createSuccessResult({
        result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
