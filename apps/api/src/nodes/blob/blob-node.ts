import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Blob node implementation
 * This node provides a blob widget that allows users to upload any file type and outputs them as binary data.
 */
export class BlobNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "blob",
    name: "Blob",
    type: "blob",
    description: "A blob widget for uploading any file type",
    tags: ["Widget", "Blob", "Load", "File"],
    icon: "file",
    documentation:
      "This node provides a blob widget for uploading any file type and outputs them as blob references. It can accept any MIME type and connect to any specific blob type (image, audio, document, etc.).",
    inputs: [
      {
        name: "value",
        type: "blob",
        description: "Current file as a blob reference",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "blob",
        type: "blob",
        description: "The uploaded file as a blob reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult("No blob data provided");
      }

      // Convert raw object to BlobValue
      return this.createSuccessResult({
        blob: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
