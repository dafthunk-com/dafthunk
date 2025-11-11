import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * NumberPreview node implementation
 * This node displays numeric data and persists the value for read-only execution views
 */
export class NumberPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-number",
    name: "Number Preview",
    type: "preview-number",
    description: "Display and preview numeric data",
    tags: ["Widget", "Preview", "Number"],
    icon: "hash",
    documentation:
      "This node displays numeric data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "number",
        description: "Numeric value to display",
        required: true,
      },
    ],
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
