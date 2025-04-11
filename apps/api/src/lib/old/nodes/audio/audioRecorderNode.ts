import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { AudioValue, NumberValue } from "../types";
import { NodeType } from "../types";

/**
 * AudioRecorder node implementation
 * This node provides an audio recorder widget that allows users to record audio from their microphone
 * and outputs the recording as an audio reference.
 */
export class AudioRecorderNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "audio-recorder",
    name: "Audio Recorder",
    description: "A widget for recording audio from the microphone",
    category: "Audio",
    icon: "mic",
    inputs: [
      {
        name: "value",
        type: AudioValue,
        description: "Current audio recording as a reference",
        hidden: true,
        value: new AudioValue(null),
      },
      {
        name: "sampleRate",
        type: NumberValue,
        description: "Audio sample rate in Hz",
        hidden: true,
        value: new NumberValue(44100),
      },
      {
        name: "channels",
        type: NumberValue,
        description: "Number of audio channels",
        hidden: true,
        value: new NumberValue(1),
      },
    ],
    outputs: [
      {
        name: "audio",
        type: AudioValue,
        description: "The recorded audio as a reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult("No audio data provided");
      }

      // If value is already an AudioValue, check if it contains data
      if (value instanceof AudioValue) {
        if (!value.getValue()) {
          return this.createErrorResult("Audio value is empty");
        }
        return this.createSuccessResult({
          audio: value,
        });
      }

      // Handle raw input values
      if (typeof value === "object") {
        // Convert raw object to AudioValue
        return this.createSuccessResult({
          audio: new AudioValue(value),
        });
      }

      // If we get here, the input is invalid
      return this.createErrorResult(
        "Invalid input: expected an audio value object"
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
