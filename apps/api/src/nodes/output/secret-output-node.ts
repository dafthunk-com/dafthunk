import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * SecretOutput node implementation
 * This node displays secret references (not the actual secret values) for display purposes
 * The secret reference is persisted for read-only execution views
 */
export class SecretOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-secret",
    name: "Secret Output",
    type: "output-secret",
    description: "Display and preview secret references",
    tags: ["Widget", "Output", "Secret"],
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
    outputs: [
      {
        name: "displayValue",
        type: "secret",
        description: "Persisted secret reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as string | undefined;

      // Validate if provided - should be a secret name reference
      if (value !== undefined && typeof value !== "string") {
        return this.createErrorResult("Value must be a secret name reference");
      }

      // Store secret reference in output for persistence - no transformation
      // The actual secret value is never exposed here
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
