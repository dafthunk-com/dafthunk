import { NodeContext, ExecutionResult } from "../../types";
import { ExecutableNode } from "../baseNode";
import {
  ArrayNodeParameter,
  StringNodeParameter,
  NumberNodeParameter,
  AudioNodeParameter,
} from "../nodeParameterTypes";
import { NodeType } from "../nodeTypes";

/**
 * Speech Recognition node implementation using Whisper Tiny English
 */
export class WhisperTinyEnNode extends ExecutableNode {
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
        type: AudioNodeParameter,
        description: "The audio file to transcribe",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: StringNodeParameter,
        description: "The transcribed text",
      },
      {
        name: "word_count",
        type: NumberNodeParameter,
        description: "The number of words in the transcription",
        hidden: true,
      },
      {
        name: "words",
        type: ArrayNodeParameter,
        description: "Detailed word timing information",
        hidden: true,
      },
      {
        name: "vtt",
        type: StringNodeParameter,
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

      // Call Cloudflare AI Whisper Tiny English model
      const response = await context.env.AI.run("@cf/openai/whisper-tiny-en", {
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
        text: new StringNodeParameter(output.text),
        word_count: new NumberNodeParameter(output.word_count),
        words: new ArrayNodeParameter(output.words),
        vtt: new StringNodeParameter(output.vtt),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
