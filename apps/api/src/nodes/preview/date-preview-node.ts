import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * DatePreview node implementation
 * This node displays date/time data and persists the value for read-only execution views
 */
export class DatePreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-date",
    name: "Date Preview",
    type: "preview-date",
    description: "Display and preview date/time data",
    tags: ["Widget", "Preview", "Date"],
    icon: "calendar",
    documentation:
      "This node displays date/time data (ISO 8601 format) in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "date",
        description: "Date/time value to display (ISO 8601 format)",
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
