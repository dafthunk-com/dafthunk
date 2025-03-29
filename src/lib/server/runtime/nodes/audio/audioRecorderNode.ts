import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../types";
import {
  AudioNodeParameter,
  StringNodeParameter,
  NumberNodeParameter,
} from "../nodeParameterTypes";
import { NodeType } from "../nodeTypes";

/**
 * AudioRecorder node implementation
 * This node provides an audio recorder widget that allows users to record audio from their microphone
 * and outputs the recording as a base64 encoded audio file.
 */
export class AudioRecorderNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "audio-recorder",
    name: "Audio Recorder",
    type: "audio-recorder",
    description: "A widget for recording audio from the microphone",
    category: "Audio",
    icon: "mic",
    inputs: [
      {
        name: "value",
        type: StringNodeParameter,
        description: "Current audio recording as base64",
        hidden: true,
        value: new StringNodeParameter(""), // Default empty string
      },
      {
        name: "sampleRate",
        type: NumberNodeParameter,
        description: "Audio sample rate in Hz",
        hidden: true,
        value: new NumberNodeParameter(44100),
      },
      {
        name: "channels",
        type: NumberNodeParameter,
        description: "Number of audio channels",
        hidden: true,
        value: new NumberNodeParameter(1),
      },
    ],
    outputs: [
      {
        name: "audio",
        type: AudioNodeParameter,
        description: "The recorded audio as a base64 encoded audio file",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      let inputs;
      try {
        if (typeof context.inputs.value !== "string") {
          return this.createErrorResult(
            `Invalid input type: expected string, got ${typeof context.inputs.value}`
          );
        }
        inputs = JSON.parse(context.inputs.value);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown parsing error";
        return this.createErrorResult(
          `Invalid input format: expected JSON string. Error: ${errorMessage}`
        );
      }

      const { value, sampleRate, channels } = inputs;

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      if (typeof sampleRate !== "number" || sampleRate < 1) {
        return this.createErrorResult("Sample rate must be a positive number");
      }

      if (typeof channels !== "number" || channels < 1) {
        return this.createErrorResult("Channels must be a positive number");
      }

      // Convert base64 directly to binary (value is already pure base64)
      const binaryString = atob(value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create properly structured audio output matching AudioParameterType requirements
      const audioOutput = {
        data: bytes,
        mimeType: "audio/webm",
      };

      // Validate the output structure
      if (!audioOutput.data || !audioOutput.mimeType) {
        throw new Error("Invalid audio output structure");
      }

      return this.createSuccessResult({
        audio: new AudioNodeParameter(audioOutput),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
