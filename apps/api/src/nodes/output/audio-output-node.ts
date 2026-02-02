import { NodeExecution, NodeType } from "@dafthunk/types";
import {
  AudioParameter,
  ExecutableNode,
  NodeContext,
} from "../../runtime/node-types";

/**
 * AudioOutput node implementation
 * This node displays audio data and persists the reference for read-only execution views
 * The audio is passed through without modification - no double-save occurs
 */
export class AudioOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-audio",
    name: "Audio Output",
    type: "output-audio",
    description: "Display and preview audio data",
    tags: ["Widget", "Output", "Audio"],
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
    outputs: [
      {
        name: "displayValue",
        type: "audio",
        description: "Persisted audio reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as AudioParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid audio blob with data and mimeType"
          );
        }

        // Validate MIME type is audio-related
        if (!value.mimeType.startsWith("audio/")) {
          return this.createErrorResult(
            "MIME type must be audio-related (e.g., audio/wav, audio/mp3)"
          );
        }
      }

      // Store audio reference in output for persistence - no transformation
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
