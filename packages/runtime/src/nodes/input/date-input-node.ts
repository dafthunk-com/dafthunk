import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * DateInput node implementation
 * This node provides a date/time input widget that outputs the entered date value.
 *
 * The date input's current value is stored as an input parameter named "value"
 * and passed directly to the output as an ISO string.
 */
export class DateInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "date-input",
    name: "Date Input",
    type: "date-input",
    description: "A date/time input widget for entering date values",
    tags: ["Widget", "Date", "Time", "Input"],
    icon: "calendar",
    documentation:
      "This node provides a date/time input widget for entering date values.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "date",
        description: "Current date value (ISO string)",
        hidden: true,
        value: "", // Default empty
      },
    ],
    outputs: [
      {
        name: "value",
        type: "date",
        description: "The current date value from the input (ISO string)",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as string;

      // Validate that it's a valid ISO date string if provided
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return this.createErrorResult("Invalid date format");
        }
      }

      return this.createSuccessResult({
        value: value || "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
