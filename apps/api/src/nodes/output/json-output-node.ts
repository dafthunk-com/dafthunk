import { JsonObject, NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * JsonOutput node implementation
 * This node displays JSON data and persists the value for read-only execution views
 */
export class JsonOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-json",
    name: "JSON Output",
    type: "output-json",
    description: "Display and preview JSON data",
    tags: ["Widget", "Output", "JSON"],
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
    outputs: [
      {
        name: "displayValue",
        type: "json",
        description: "Persisted JSON value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as JsonObject | undefined;

      // JSON value can be any JSON-serializable type, no strict validation needed
      // Just pass through the value as-is

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value ?? {},
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
