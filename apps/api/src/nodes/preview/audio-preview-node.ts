import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * AudioPreview node implementation
 * This node displays audio data and persists the reference for read-only execution views
 * The audio is passed through without modification - no double-save occurs
 */
export class AudioPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-audio",
    name: "Audio Preview",
    type: "preview-audio",
    description: "Display and preview audio data",
    tags: ["Widget", "Preview", "Audio"],
    icon: "volume-2",
    documentation:
      "This node displays audio data in the workflow. The audio reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the audio passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "audio",
        description: "Audio to display",
        required: true,
      },
    ],
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
