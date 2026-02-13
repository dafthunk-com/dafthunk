import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * JSON Editor node implementation
 * This node provides a JSON Editor widget specifically for JSON editing.
 *
 * The editor's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class JsonInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-input",
    name: "JSON Input",
    type: "json-input",
    description: "A JSON Editor widget for editing and validating JSON",
    tags: ["Widget", "Data", "JSON", "Edit"],
    icon: "code",
    documentation:
      "This node provides a JSON editor widget for editing and validating JSON data with syntax highlighting and error checking.",
    inputs: [
      {
        name: "json",
        type: "json",
        description: "Current JSON value in the editor",
        hidden: true,
        value: {},
      },
    ],
    outputs: [
      {
        name: "json",
        type: "json",
        description: "The current JSON value from the editor",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { json } = context.inputs;

    // Handle null or undefined
    if (json === null || json === undefined) {
      return this.createErrorResult("No JSON value provided");
    }

    return this.createSuccessResult({ json });
  }
}
