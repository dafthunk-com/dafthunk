import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Speech Recognition node implementation using Whisper
 */
export class WhisperNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "speech-recognition",
    name: "Speech Recognition",
    type: "speech-recognition",
    description:
      "Transcribes speech from audio files using OpenAI's Whisper model",
    category: "Audio",
    icon: "mic",
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "The audio file to transcribe",
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "The transcribed text",
      },
      {
        name: "word_count",
        type: "number",
        description: "The number of words in the transcription",
      },
      {
        name: "words",
        type: "array",
        description: "Detailed word timing information",
      },
      {
        name: "vtt",
        type: "string",
        description: "WebVTT format of the transcription",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { audio } = context.inputs;

      // Validate inputs
      if (!audio || !audio.data) {
        throw new Error("Audio input is required");
      }

      console.log(
        `Processing audio file for speech recognition, data length: ${audio.data.length} bytes`
      );

      // Prepare the audio data - convert back to Uint8Array
      const audioData = new Uint8Array(audio.data);

      // Call Cloudflare AI Whisper model
      const response = await context.env.AI.run("@cf/openai/whisper", {
        audio: Array.from(audioData),
      });

      console.log("Whisper transcription response:", response);

      // Extract the results
      const { text, word_count, words, vtt } = response;

      return this.createSuccessResult({
        text,
        word_count,
        words,
        vtt,
      });
    } catch (error) {
      console.error("WhisperNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
