import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * BooleanPreview node implementation
 * This node displays boolean data and persists the value for read-only execution views
 */
export class BooleanPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-boolean",
    name: "Boolean Preview",
    type: "preview-boolean",
    description: "Display and preview boolean data",
    tags: ["Widget", "Preview", "Boolean"],
    icon: "toggle-right",
    documentation:
      "This node displays boolean data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "boolean",
        description: "Boolean value to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "boolean",
        description: "Persisted value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as boolean | undefined;

      // Validate if provided
      if (value !== undefined && typeof value !== "boolean") {
        return this.createErrorResult("Value must be a boolean");
      }

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value ?? false,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
