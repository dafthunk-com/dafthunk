import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * AudioRecorder node implementation
 * This node provides an audio recorder widget that allows users to record audio from their microphone
 * and outputs the recording as an audio reference.
 */
export class AudioRecorderNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "audio-recorder",
    name: "Audio Recorder",
    type: "audio-recorder",
    description: "A widget for recording audio from the microphone",
    tags: ["Widget", "Audio", "Record"],
    icon: "mic",
    documentation:
      "This node provides an audio recorder widget that allows users to record audio from their microphone and outputs the recording.",
    inputs: [
      {
        name: "value",
        type: "audio",
        description: "Current audio recording as a reference",
        hidden: true,
      },
      {
        name: "sampleRate",
        type: "number",
        description: "Audio sample rate in Hz",
        hidden: true,
        value: 44100,
      },
      {
        name: "channels",
        type: "number",
        description: "Number of audio channels",
        hidden: true,
        value: 1,
      },
    ],
    outputs: [
      {
        name: "audio",
        type: "audio",
        description: "The recorded audio as a reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult("No audio data provided");
      }

      return this.createSuccessResult({
        audio: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
