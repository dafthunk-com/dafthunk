import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * AnyPreview node implementation
 * This node displays any data type and persists the value for read-only execution views
 * Can accept any parameter type (mixed types)
 */
export class AnyPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-any",
    name: "Any Preview",
    type: "preview-any",
    description: "Display and preview any data type",
    tags: ["Widget", "Preview", "Any"],
    icon: "eye",
    documentation:
      "This node displays any data type in the workflow. It accepts any parameter type and persists the value for viewing in read-only execution and deployed workflow views. Useful for generic data inspection.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "any",
        description: "Any value to display",
        required: true,
      },
    ],
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      // The "any" type accepts anything - no validation needed
      // Just validate and return - value input is persisted automatically
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
