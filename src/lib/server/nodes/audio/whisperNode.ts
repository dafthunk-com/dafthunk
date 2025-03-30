import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ExecutableNode } from "../types";
import { ArrayValue, StringValue, NumberValue, AudioValue } from "../types";
import { NodeType } from "../types";

/**
 * Speech Recognition node implementation using Whisper
 */
export class WhisperNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "whisper",
    name: "Whisper",
    type: "speech-recognition",
    description:
      "Transcribes speech from audio files using OpenAI's Whisper model",
    category: "Audio",
    icon: "mic",
    inputs: [
      {
        name: "audio",
        type: AudioValue,
        description: "The audio file to transcribe",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: StringValue,
        description: "The transcribed text",
      },
      {
        name: "word_count",
        type: NumberValue,
        description: "The number of words in the transcription",
        hidden: true,
      },
      {
        name: "words",
        type: ArrayValue,
        description: "Detailed word timing information",
        hidden: true,
      },
      {
        name: "vtt",
        type: StringValue,
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

      // Call Cloudflare AI Whisper model
      const response = await context.env.AI.run("@cf/openai/whisper", {
        audio: Array.from(audio.data),
      });

      // Extract the results
      const output = {
        text: response.text,
        word_count: response.word_count,
        words: response.words,
        vtt: response.vtt,
      };

      return this.createSuccessResult({
        text: new StringValue(output.text),
        word_count: new NumberValue(output.word_count),
        words: new ArrayValue(output.words),
        vtt: new StringValue(output.vtt),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
