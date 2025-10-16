import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * JavaScript Editor node implementation
 * This node provides a JavaScript Editor widget specifically for JavaScript editing.
 *
 * The editor's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class JavaScriptEditorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "javascript-editor",
    name: "JavaScript Editor",
    type: "javascript-editor",
    description:
      "A JavaScript Editor widget for editing and validating JavaScript code",
    tags: ["JavaScript"],
    icon: "code",
    documentation:
      "This node provides a JavaScript Editor widget for editing and validating JavaScript code.",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current JavaScript code in the editor",
        hidden: true,
        value: "// Write your JavaScript code here",
      },
    ],
    outputs: [
      {
        name: "javascript",
        type: "string",
        description: "The current JavaScript code from the editor",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;
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
