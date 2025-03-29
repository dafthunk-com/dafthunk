import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import { StringNodeParameter } from "../nodeParameterTypes";

/**
 * TextArea node implementation
 * This node provides a text area widget that outputs the entered text value.
 *
 * The text area's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class TextAreaNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "text-area",
    name: "Text Area",
    type: "text-area",
    description: "A text area widget for entering multi-line text",
    category: "Text",
    icon: "text",
    inputs: [
      {
        name: "value",
        type: StringNodeParameter,
        description: "Current text value in the text area",
        hidden: true,
        value: new StringNodeParameter(""), // Default empty string
      },
      {
        name: "placeholder",
        type: StringNodeParameter,
        description: "Placeholder text to show when empty",
        hidden: true,
        value: undefined, // Allow undefined as default
      },
    ],
    outputs: [
      {
        name: "value",
        type: StringNodeParameter,
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
        value: new StringNodeParameter(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
