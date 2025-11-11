import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * StringPreview node implementation
 * This node displays string data and persists the value for read-only execution views
 */
export class StringPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-string",
    name: "String Preview",
    type: "preview-string",
    description: "Display and preview string data",
    tags: ["Widget", "Preview", "String"],
    icon: "text",
    documentation:
      "This node displays string data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "string",
        description: "String value to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "string",
        description: "Persisted value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as string | undefined;

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value ?? "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
