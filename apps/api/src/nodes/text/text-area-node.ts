import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * TextArea node implementation
 * This node provides a text area widget that outputs the entered text value.
 *
 * The text area's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class TextAreaNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "text-area",
    name: "Text Area",
    type: "text-area",
    description: "A text area widget for entering multi-line text",
    tags: ["Widget", "Text", "Input"],
    icon: "text",
    documentation:
      "This node provides a text area widget for entering multi-line text.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current text value in the text area",
        hidden: true,
        value: "", // Default empty string
      },
      {
        name: "placeholder",
        type: "string",
        description: "Placeholder text to show when empty",
        hidden: true,
      },
      {
        name: "rows",
        type: "number",
        description: "Number of rows in the text area",
        hidden: true,
        value: 4, // Default 4 rows
      },
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description: "The current text value from the text area",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as string;
      const placeholder = context.inputs.placeholder as string | undefined;

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      if (placeholder !== undefined && typeof placeholder !== "string") {
        return this.createErrorResult(
          "Placeholder must be a string or undefined"
        );
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
