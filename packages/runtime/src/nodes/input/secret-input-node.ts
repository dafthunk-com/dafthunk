import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * SecretInput node implementation
 * This node provides a secret input widget that outputs a secret reference.
 */
export class SecretInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "secret-input",
    name: "Secret Input",
    type: "secret-input",
    description: "A secret input widget for selecting secrets",
    tags: ["Widget", "Secret", "Input"],
    icon: "key",
    documentation:
      "This node provides a secret input widget for selecting stored secrets.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "secret",
        description: "Current secret reference",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "secret",
        description: "The secret reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (!value) {
        return this.createErrorResult("No secret selected");
      }

      return this.createSuccessResult({
        value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
