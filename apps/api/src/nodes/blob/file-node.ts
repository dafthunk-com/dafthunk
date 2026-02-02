import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * File node implementation
 * This node provides a generic file widget that allows users to upload any file type
 * and outputs them as file references (blob type).
 * It serves as a unified replacement for the blob and document nodes.
 */
export class FileNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "file",
    name: "File Upload",
    type: "file",
    description: "A generic file widget for uploading any file type",
    tags: ["Widget", "File", "Load", "Upload"],
    icon: "file",
    documentation:
      "This node provides a generic file widget for uploading any file type and outputs them as file references. It supports images, audio, documents, and any other file format. The output type is 'blob' but can connect to nodes expecting specific types (image, audio, document, etc.) due to MIME type compatibility.",
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
        name: "file",
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
        return this.createErrorResult("No file data provided");
      }

      // Return the file as a blob reference
      return this.createSuccessResult({
        file: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
