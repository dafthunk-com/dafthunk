import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * SecretPreview node implementation
 * This node displays secret references (not the actual secret values) for display purposes
 * The secret reference is persisted for read-only execution views
 */
export class SecretPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-secret",
    name: "Secret Preview",
    type: "preview-secret",
    description: "Display and preview secret references",
    tags: ["Widget", "Preview", "Secret"],
    icon: "lock",
    documentation:
      "This node displays secret references in the workflow. The actual secret value is never displayed - only the secret name reference is shown. The reference is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "secret",
        description: "Secret reference to display (secret name, not value)",
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
