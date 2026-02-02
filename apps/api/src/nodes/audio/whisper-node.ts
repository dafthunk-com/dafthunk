import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: Whisper STT model
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.05,
  outputCostPerMillion: 0.05,
};

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
    tags: ["Audio", "STT", "OpenAI", "Whisper"],
    icon: "mic",
    documentation:
      "This node transcribes speech from audio files using OpenAI's Whisper model, converting spoken words to text.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/whisper/",
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
