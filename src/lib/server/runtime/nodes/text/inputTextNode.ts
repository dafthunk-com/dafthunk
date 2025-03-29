import { ExecutableNode } from "../executableNode";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import { StringNodeParameter } from "../nodeParameterTypes";
/**
 * InputText node implementation
 * This node provides a text input widget that outputs the entered text value.
 *
 * The text input's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class InputTextNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "input-text",
    name: "Text Input",
    type: "input-text",
    description: "A text input widget for entering single-line text",
    category: "Text",
    icon: "text",
    inputs: [
      {
        name: "value",
        type: StringNodeParameter,
        description: "Current text value in the input",
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
        description: "The current text value from the input",
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
