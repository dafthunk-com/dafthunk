import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Speech Recognition node implementation using Whisper Tiny English
 */
export class WhisperTinyEnNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "speech-recognition-tiny-en",
    name: "Speech Recognition (Tiny English)",
    type: "speech-recognition-tiny-en",
    description:
      "Transcribes English speech from audio files using OpenAI's Whisper Tiny English model - optimized for English speech recognition",
    category: "Audio",
    icon: "mic",
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "The audio file to transcribe",
        required: true,
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
        hidden: true,
      },
      {
        name: "words",
        type: "array",
        description: "Detailed word timing information",
        hidden: true,
      },
      {
        name: "vtt",
        type: "string",
        description: "WebVTT format of the transcription",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { audio } = context.inputs;

      console.log(
        `Processing audio file for speech recognition with Whisper Tiny English, data length: ${audio.data.length} bytes`
      );

      // Call Cloudflare AI Whisper Tiny English model
      const response = await context.env.AI.run("@cf/openai/whisper-tiny-en", {
        audio: Array.from(audio.data),
      });

      console.log("Whisper Tiny English transcription response:", response);

      // Extract the results
      const output = {
        text: response.text,
        word_count: response.word_count,
        words: response.words,
        vtt: response.vtt,
      };

      return this.createSuccessResult(output);
    } catch (error) {
      console.error("WhisperTinyEnNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
