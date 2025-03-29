import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ExecutableNode } from "../types";
import {
  ArrayParameter,
  StringParameter,
  NumberParameter,
  AudioParameter,
} from "../types";
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
        type: AudioParameter,
        description: "The audio file to transcribe",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: StringParameter,
        description: "The transcribed text",
      },
      {
        name: "word_count",
        type: NumberParameter,
        description: "The number of words in the transcription",
        hidden: true,
      },
      {
        name: "words",
        type: ArrayParameter,
        description: "Detailed word timing information",
        hidden: true,
      },
      {
        name: "vtt",
        type: StringParameter,
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
        text: new StringParameter(output.text),
        word_count: new NumberParameter(output.word_count),
        words: new ArrayParameter(output.words),
        vtt: new StringParameter(output.vtt),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
