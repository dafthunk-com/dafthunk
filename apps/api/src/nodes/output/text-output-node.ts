import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * TextOutput node implementation
 * This node displays text data and persists the value for read-only execution views
 */
export class TextOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-text",
    name: "Text Output",
    type: "output-text",
    description: "Display and preview text data",
    tags: ["Widget", "Output", "Text"],
    icon: "text",
    documentation:
      "This node displays text data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Text value to display",
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
