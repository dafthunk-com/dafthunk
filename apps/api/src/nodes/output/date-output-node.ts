import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * DateOutput node implementation
 * This node displays date/time data and persists the value for read-only execution views
 */
export class DateOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-date",
    name: "Date Output",
    type: "output-date",
    description: "Display and preview date/time data",
    tags: ["Widget", "Output", "Date"],
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
    outputs: [
      {
        name: "displayValue",
        type: "date",
        description: "Persisted value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as string | undefined;

      // Validate if provided - should be ISO 8601 string
      if (value !== undefined && typeof value !== "string") {
        return this.createErrorResult("Value must be an ISO 8601 date string");
      }

      // Optionally validate ISO format
      if (value !== undefined) {
        try {
          new Date(value);
        } catch {
          return this.createErrorResult(
            "Value must be a valid ISO 8601 date string"
          );
        }
      }

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value ?? new Date().toISOString(),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
