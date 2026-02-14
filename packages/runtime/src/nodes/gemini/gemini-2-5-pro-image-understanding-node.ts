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
 * Gemini 2.5 Pro Image Understanding node implementation using the Google GenAI SDK
 * Higher-quality image analysis with advanced reasoning capabilities
 */
export class Gemini25ProImageUnderstandingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-pro-image-understanding",
    name: "Gemini 2.5 Pro Image Understanding",
    type: "gemini-2-5-pro-image-understanding",
    description:
      "Analyzes and understands image content with advanced reasoning, description, and object detection",
    tags: ["AI", "Image", "Google", "Gemini", "Understanding", "Pro"],
    icon: "eye",
    documentation:
      "This node uses Google's Gemini 2.5 Pro model for high-quality image analysis with advanced reasoning capabilities.",
    usage: 1,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "Image file to analyze (PNG, JPEG, WEBP, HEIC, HEIF)",
        required: true,
      },
      {
        name: "prompt",
        type: "string",
        description:
          "Instructions for image analysis (e.g., 'Describe this image', 'What objects do you see?')",
        required: true,
        value: "Analyze this image content",
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
          "Generated text response (description, analysis, or object detection results)",
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
      const { image, prompt, thinking_budget } = context.inputs;

      if (!image) {
        return this.createErrorResult("Image input is required");
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

      // Convert image data to base64 safely
      const imageBase64 = Buffer.from(image.data).toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: image.mimeType,
                  data: imageBase64,
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

      // Calculate usage based on token counts
      const usageMetadata = response.usageMetadata;
      const usage = calculateTokenUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        PRICING
      );

      return this.createSuccessResult(
        {
          text: textParts,
          finish_reason: candidate.finishReason || "STOP",
        },
        usage
      );
    } catch (error) {
      console.error("Gemini Pro Image Understanding error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
