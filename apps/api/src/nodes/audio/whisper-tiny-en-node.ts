import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: Whisper Tiny English STT model (smaller, cheaper)
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.02,
  outputCostPerMillion: 0.02,
};

/**
 * Speech Recognition node implementation using Whisper Tiny English
 */
export class WhisperTinyEnNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "whisper-tiny-en",
    name: "Speech Recognition (Whisper Tiny)",
    type: "whisper-tiny-en",
    description:
      "Transcribes English speech from audio files using OpenAI's Whisper Tiny English model - optimized for English speech recognition",
    tags: ["Audio", "STT", "Cloudflare", "Whisper"],
    icon: "mic",
    documentation:
      "This node transcribes English speech from audio files using OpenAI's Whisper Tiny English model, optimized specifically for English speech recognition.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/whisper-tiny-en/",
    usage: 1,
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

      // Call Cloudflare AI Whisper Tiny English model
      const response = await context.env.AI.run(
        "@cf/openai/whisper-tiny-en",
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

      // Calculate usage based on audio size and output text
      // Estimate input as audio bytes / 100 (rough approximation for audio tokens)
      const audioTokenEstimate = Math.ceil(audio.data.length / 100);
      const usage = calculateTokenUsage(
        audioTokenEstimate,
        output.text || "",
        PRICING
      );

      return this.createSuccessResult(
        {
          text: output.text,
          word_count: output.word_count,
          words: output.words,
          vtt: output.vtt,
        },
        usage
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
