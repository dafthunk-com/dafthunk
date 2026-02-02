import type { NodeExecution, NodeType } from "@dafthunk/types";

import type { NodeContext } from "../../runtime/node-types";
import { ExecutableNode } from "../../runtime/node-types";

/**
 * TextInput node implementation
 * This node provides a text input widget that outputs the entered text value.
 *
 * The text input's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class TextInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "text-input",
    name: "Text Input",
    type: "text-input",
    description: "A text input widget for entering text",
    tags: ["Widget", "Text", "Input"],
    icon: "text",
    documentation: "This node provides a text input widget for entering text.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current text value",
        hidden: true,
        value: "", // Default empty string
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

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
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
