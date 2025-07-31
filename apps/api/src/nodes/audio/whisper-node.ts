import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";

/**
 * Speech Recognition node implementation using Whisper
 */
export class WhisperNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "whisper",
    name: "Speech Recognition (Whisper)",
    type: "whisper",
    description:
      "Transcribes speech from audio files using OpenAI's Whisper model",
    tags: ["Audio"],
    icon: "mic",
    computeCost: 10,
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
        type: "json",
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { audio } = context.inputs;

      // Call Cloudflare AI Whisper model
      const response = await context.env.AI.run(
        "@cf/openai/whisper",
        {
          audio: Array.from(audio.data),
        },
        context.env.AI_OPTIONS
      );

      // Extract the results
      const output = {
        text: response.text,
        word_count: response.word_count,
        words: response.words,
        vtt: response.vtt,
      };

      return this.createSuccessResult({
        text: output.text,
        word_count: output.word_count,
        words: output.words,
        vtt: output.vtt,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
