import type { NodeExecution, NodeType } from "@dafthunk/types";

import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";

/**
 * AudioInput node implementation
 * This node provides an audio input widget that outputs an audio reference.
 */
export class AudioInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "audio-input",
    name: "Audio Input",
    type: "audio-input",
    description: "An audio input widget for uploading audio files",
    tags: ["Widget", "Audio", "Input"],
    icon: "music",
    documentation:
      "This node provides an audio input widget for uploading audio files.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "audio",
        description: "Current audio value",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "audio",
        description: "The uploaded audio",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (!value) {
        return this.createErrorResult("No audio provided");
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
