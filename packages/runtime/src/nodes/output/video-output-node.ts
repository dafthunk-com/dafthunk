import {
  ExecutableNode,
  type NodeContext,
  type VideoParameter,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * VideoOutput node implementation
 * This node displays video data and persists the reference for read-only execution views
 * The video is passed through without modification - no double-save occurs
 */
export class VideoOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-video",
    name: "Video Output",
    type: "output-video",
    description: "Display and preview video data",
    tags: ["Widget", "Output", "Video"],
    icon: "video",
    documentation:
      "This node displays video data in the workflow. The video reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the video passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "video",
        description: "Video to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "video",
        description: "Persisted video reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as VideoParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid video blob with data and mimeType"
          );
        }

        // Validate MIME type is video-related
        if (!value.mimeType.startsWith("video/")) {
          return this.createErrorResult(
            "MIME type must be video-related (e.g., video/mp4, video/webm)"
          );
        }
      }

      // Store video reference in output for persistence - no transformation
      return this.createSuccessResult({
        displayValue: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
