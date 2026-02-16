import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/pricing (Gemini 2.5 Flash with image input)
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.3,
  outputCostPerMillion: 2.5,
};

/**
 * Gemini 2.5 Flash Image Understanding node implementation using the Google GenAI SDK
 * Analyzes and understands image content, providing description, analysis, and object detection
 */
export class Gemini25FlashImageUnderstandingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-image-understanding",
    name: "Gemini 2.5 Flash Image Understanding",
    type: "gemini-2-5-flash-image-understanding",
    description:
      "Analyzes and understands image content with description, analysis, and object detection capabilities",
    tags: ["AI", "Image", "Google", "Gemini", "Understanding"],
    icon: "eye",
    documentation:
      "This node uses Google's Gemini 2.5 Flash model to analyze and understand image content. Supports up to 3 images for comparison and multi-image analysis.",
    usage: 1,
    inputs: [
      {
        name: "image",
        type: "image",
        description:
          "Primary image file to analyze (PNG, JPEG, WEBP, HEIC, HEIF)",
        required: true,
      },
      {
        name: "image2",
        type: "image",
        description:
          "Optional second image for comparison or multi-image analysis",
        required: false,
        hidden: true,
      },
      {
        name: "image3",
        type: "image",
        description: "Optional third image for multi-image analysis",
        required: false,
        hidden: true,
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
          "Generated text response (description, analysis, or object detection results)",
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
      const { image, image2, image3, prompt, thinking_budget } = context.inputs;

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

      // Build parts array with prompt text followed by images
      const parts: any[] = [{ text: prompt }];

      // Add primary image
      const imageBase64 = Buffer.from(image.data).toString("base64");
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: imageBase64,
        },
      });

      // Add optional additional images
      for (const extraImage of [image2, image3]) {
        if (extraImage?.data) {
          const extraBase64 = Buffer.from(extraImage.data).toString("base64");
          parts.push({
            inlineData: {
              mimeType: extraImage.mimeType,
              data: extraBase64,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts }],
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
      console.error("Gemini Image Understanding error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
