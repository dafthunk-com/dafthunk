import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/pricing (Gemini 2.5 Flash with audio input: $1.00 per MTok)
const PRICING: TokenPricing = {
  inputCostPerMillion: 1.0,
  outputCostPerMillion: 2.5,
};

/**
 * Gemini 2.5 Flash Audio Understanding node implementation using the Google GenAI SDK
 * Analyzes and understands audio content, providing transcription, description, and analysis
 */
export class Gemini25FlashAudioUnderstandingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-audio-understanding",
    name: "Gemini 2.5 Flash Audio Understanding",
    type: "gemini-2-5-flash-audio-understanding",
    description:
      "Analyzes and understands audio content with transcription, description, and analysis capabilities",
    tags: ["AI", "Audio", "Google", "Gemini", "Understanding"],
    icon: "headphones",
    documentation:
      "This node uses Google's Gemini 2.5 Flash model to analyze and understand audio content.",
    usage: 1,
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "Audio file to analyze (WAV, MP3, AIFF, AAC, OGG, FLAC)",
        required: true,
      },
      {
        name: "prompt",
        type: "string",
        description:
          "Instructions for audio analysis (e.g., 'Transcribe this audio', 'Describe what you hear')",
        required: true,
        value: "Analyze this audio content",
      },
      {
        name: "thinking_budget",
        type: "number",
        description:
          "Thinking budget (0-1000). Higher values enable more reasoning but increase cost and latency",
        required: false,
        value: 100,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description:
          "Generated text response (transcription, description, or analysis)",
      },
      {
        name: "usage_metadata",
        type: "json",
        description: "Token usage and cost information",
        hidden: true,
      },
      {
        name: "prompt_feedback",
        type: "json",
        description: "Feedback about the prompt quality and safety",
        hidden: true,
      },
      {
        name: "finish_reason",
        type: "string",
        description:
          "Reason why the generation finished (STOP, MAX_TOKENS, etc.)",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { audio, prompt, thinking_budget } = context.inputs;

      if (!audio) {
        return this.createErrorResult("Audio input is required");
      }

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const ai = new GoogleGenAI({
        apiKey: "gateway-managed",
        ...getGoogleAIConfig(context.env),
      });

      const config: any = {};

      // Configure thinking budget if provided
      if (thinking_budget !== undefined && thinking_budget !== null) {
        config.thinkingConfig = {
          thinkingBudget: thinking_budget,
        };
      }

      // Convert audio data to base64 safely
      const audioBase64 = Buffer.from(audio.data).toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: audio.mimeType,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        config,
      });

      // Extract response data
      if (!response?.candidates?.[0]?.content?.parts) {
        return this.createErrorResult("Invalid response from Gemini API");
      }

      const candidate = response.candidates[0];
      const content = candidate.content;
      if (!content?.parts) {
        return this.createErrorResult(
          "Invalid content structure from Gemini API"
        );
      }

      const textParts = content.parts
        .filter((part: any) => part?.text)
        .map((part: any) => part.text)
        .join("");

      if (!textParts) {
        return this.createErrorResult("No text generated in response");
      }

      // Extract metadata safely
      const usageMetadata = response.usageMetadata
        ? {
            promptTokenCount: response.usageMetadata.promptTokenCount,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
            totalTokenCount: response.usageMetadata.totalTokenCount,
          }
        : null;

      const promptFeedback = response.promptFeedback
        ? {
            blockReason: response.promptFeedback.blockReason,
            safetyRatings: response.promptFeedback.safetyRatings,
          }
        : null;

      const finishReason = candidate.finishReason || null;

      // Calculate usage based on token counts
      const usage = calculateTokenUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        PRICING
      );

      return this.createSuccessResult(
        {
          text: textParts,
          ...(usageMetadata && { usage_metadata: usageMetadata }),
          ...(promptFeedback && { prompt_feedback: promptFeedback }),
          ...(finishReason && { finish_reason: finishReason }),
        },
        usage
      );
    } catch (error) {
      console.error("Gemini Audio Understanding error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
