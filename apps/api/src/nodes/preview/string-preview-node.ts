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
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      // Value input is persisted automatically by the workflow system
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
