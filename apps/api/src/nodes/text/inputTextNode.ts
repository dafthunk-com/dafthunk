import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";

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
        type: "string",
        description: "Current text value in the input",
        hidden: true,
        value: "", // Default empty string
      },
      {
        name: "placeholder",
        type: "string",
        description: "Placeholder text to show when empty",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description: "The current text value from the input",
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
