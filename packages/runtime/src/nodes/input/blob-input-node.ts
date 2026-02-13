import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * BlobInput node implementation
 * This node provides a blob input widget that outputs a blob reference.
 */
export class BlobInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "blob-input",
    name: "Blob Input",
    type: "blob-input",
    description: "A blob input widget for uploading files",
    tags: ["Widget", "Blob", "Input", "File"],
    icon: "file",
    documentation:
      "This node provides a blob input widget for uploading files.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "blob",
        description: "Current blob value",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "blob",
        description: "The uploaded blob",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (!value) {
        return this.createErrorResult("No blob provided");
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
