import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * JsonPreview node implementation
 * This node displays JSON data and persists the value for read-only execution views
 */
export class JsonPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-json",
    name: "JSON Preview",
    type: "preview-json",
    description: "Display and preview JSON data",
    tags: ["Widget", "Preview", "JSON"],
    icon: "braces",
    documentation:
      "This node displays JSON data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "json",
        description: "JSON data to display",
        required: true,
      },
    ],
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      // JSON value can be any JSON-serializable type, no strict validation needed
      // Just validate and return - value input is persisted automatically
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
