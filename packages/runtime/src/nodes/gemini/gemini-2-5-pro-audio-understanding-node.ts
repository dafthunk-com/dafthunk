import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/pricing (Gemini 2.5 Pro)
const PRICING: TokenPricing = {
  inputCostPerMillion: 1.25,
  outputCostPerMillion: 10.0,
};

/**
 * Gemini 2.5 Pro Audio Understanding node implementation using the Google GenAI SDK
 * Higher-quality audio analysis with advanced reasoning capabilities
 */
export class Gemini25ProAudioUnderstandingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-pro-audio-understanding",
    name: "Gemini 2.5 Pro Audio Understanding",
    type: "gemini-2-5-pro-audio-understanding",
    description:
      "Analyzes and understands audio content with advanced reasoning, transcription, and analysis",
    tags: ["AI", "Audio", "Google", "Gemini", "Understanding", "Pro"],
    icon: "headphones",
    documentation:
      "This node uses Google's Gemini 2.5 Pro model for high-quality audio analysis with advanced reasoning capabilities.",
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
          "Thinking budget (0-16384). Higher values enable more reasoning but increase cost and latency",
        required: false,
        value: 1024,
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
        model: "gemini-2.5-pro",
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
      console.error("Gemini Pro Audio Understanding error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
