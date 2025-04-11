import { ExecutableNode, NumberValue } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { StringValue } from "../types";

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
    description: "A text area widget for entering multi-line text",
    category: "Text",
    icon: "text",
    inputs: [
      {
        name: "value",
        type: StringValue,
        description: "Current text value in the text area",
        hidden: true,
        value: new StringValue(""), // Default empty string
      },
      {
        name: "placeholder",
        type: StringValue,
        description: "Placeholder text to show when empty",
        hidden: true,
        value: undefined, // Allow undefined as default
      },
      {
        name: "rows",
        type: NumberValue,
        description: "Number of rows in the text area",
        hidden: true,
        value: new NumberValue(4), // Default 4 rows
      },
    ],
    outputs: [
      {
        name: "value",
        type: StringValue,
        description: "The current text value from the text area",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
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
        value: new StringValue(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
