import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/gemini-api/docs/pricing (Gemini 3.1 Flash)
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.5,
  outputCostPerMillion: 3.0,
};

/**
 * Gemini 3.1 Flash Image Preview node implementation using the Google GenAI SDK
 * High-efficiency image generation optimized for speed and high-volume use
 */
export class Gemini31FlashImagePreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-3-1-flash-image-preview",
    name: "Gemini 3.1 Flash Image Preview",
    type: "gemini-3-1-flash-image-preview",
    description:
      "Fast image generation optimized for speed and high-volume use",
    tags: ["AI", "Image", "Google", "Gemini", "Flash", "Preview"],
    icon: "image",
    documentation:
      "This node uses Google's Gemini 3.1 Flash Image Preview model for high-efficiency image generation optimized for speed, advanced text rendering, and high-volume developer use cases.",
    usage: 1,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text prompt describing the image to generate",
        required: true,
      },
      {
        name: "image1",
        type: "image",
        description:
          "Optional first input image to use as reference for generation",
        required: false,
        hidden: true,
      },
      {
        name: "image2",
        type: "image",
        description:
          "Optional second input image for multi-image composition or style transfer",
        required: false,
        hidden: true,
      },
      {
        name: "image3",
        type: "image",
        description:
          "Optional third input image for multi-image composition (works best with up to 3 images)",
        required: false,
        hidden: true,
      },
      {
        name: "aspectRatio",
        type: "string",
        description:
          "Aspect ratio of generated images (1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9)",
        required: false,
        hidden: true,
        value: "1:1",
      },
      {
        name: "imageSize",
        type: "string",
        description: "Size of generated images (512px, 1K, 2K, or 4K)",
        required: false,
        hidden: true,
        value: "1K",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Generated image from Gemini 3.1 Flash Image Preview",
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
    let ai: GoogleGenAI | undefined;

    try {
      const { prompt, image1, image2, image3, aspectRatio, imageSize } =
        context.inputs;

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      // Validate aspect ratio
      const validAspectRatios = [
        "1:1",
        "1:4",
        "1:8",
        "2:3",
        "3:2",
        "3:4",
        "4:1",
        "4:3",
        "4:5",
        "5:4",
        "8:1",
        "9:16",
        "16:9",
        "21:9",
      ];
      if (aspectRatio && !validAspectRatios.includes(aspectRatio)) {
        return this.createErrorResult(
          `Invalid aspectRatio. Must be one of: ${validAspectRatios.join(", ")}`
        );
      }

      // Validate image size
      const validSizes = ["512px", "1K", "2K", "4K"];
      if (imageSize && !validSizes.includes(imageSize)) {
        return this.createErrorResult(
          `Invalid imageSize. Must be one of: ${validSizes.join(", ")}`
        );
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const googleConfig = getGoogleAIConfig(context.env);
      ai = new GoogleGenAI({
        apiKey: "gateway-managed",
        httpOptions: {
          ...googleConfig.httpOptions,
          timeout: 300_000, // 5 min — image generation can be slow
        },
      });

      const config: any = {
        responseModalities: ["TEXT", "IMAGE"],
      };

      // Configure image generation options
      if (aspectRatio || imageSize) {
        config.imageConfig = {};
        if (aspectRatio) {
          config.imageConfig.aspectRatio = aspectRatio;
        }
        if (imageSize) {
          config.imageConfig.imageSize = imageSize;
        }
      }

      // Prepare the prompt data
      const promptData: any[] = [{ text: prompt }];

      // Helper function to convert image data to base64
      const convertImageToBase64 = (image: any): string => {
        if (typeof image.data === "string") {
          return image.data;
        } else {
          const buffer = new Uint8Array(image.data);
          return btoa(
            buffer.reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
        }
      };

      // Add images to prompt data
      const images = [image1, image2, image3].filter((img) => img?.data);

      for (const image of images) {
        if (image?.data) {
          const base64Data = convertImageToBase64(image);
          console.log(
            `Adding image to prompt: mimeType=${image.mimeType}, dataLength=${base64Data.length}`
          );

          promptData.push({
            inlineData: {
              mimeType: image.mimeType || "image/png",
              data: base64Data,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: promptData,
        config,
      });

      // Process the response to find generated image
      if (!response?.candidates?.[0]?.content?.parts) {
        return this.createErrorResult("No response generated from Gemini API");
      }

      const candidate = response.candidates[0];
      const content = candidate.content;

      if (!content?.parts) {
        return this.createErrorResult(
          "Invalid response structure from Gemini API"
        );
      }

      // Look for generated image in response
      let imageData: Uint8Array | null = null;
      let imageMimeType: string | null = null;

      for (const part of content.parts) {
        if (part?.inlineData?.data) {
          console.log(
            `Found generated image: mimeType=${part.inlineData.mimeType}, dataLength=${part.inlineData.data.length}`
          );

          // Convert base64 data to Uint8Array for proper object store handling
          imageData = Uint8Array.from(atob(part.inlineData.data), (c) =>
            c.charCodeAt(0)
          );
          imageMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }

      if (!imageData || !imageMimeType) {
        // Check for text-only response
        for (const part of content.parts) {
          if (part?.text) {
            return this.createErrorResult(
              `No image generated. Text response: ${part.text}`
            );
          }
        }
        return this.createErrorResult("No image or text generated in response");
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

      const usage = calculateTokenUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        PRICING
      );

      return this.createSuccessResult(
        {
          image: {
            data: imageData,
            mimeType: imageMimeType,
          },
          ...(usageMetadata && { usage_metadata: usageMetadata }),
          ...(promptFeedback && { prompt_feedback: promptFeedback }),
          ...(finishReason && { finish_reason: finishReason }),
        },
        usage
      );
    } catch (error) {
      // Surface empty-response errors clearly — typically an AI Gateway issue
      if (
        error instanceof SyntaxError &&
        error.message.includes("end of JSON")
      ) {
        console.error(
          "Gemini 3.1 Flash Image Preview: received empty or truncated response from AI Gateway"
        );
        return this.createErrorResult(
          "Received empty response from AI Gateway. The gateway may not support this model yet — check Cloudflare AI Gateway logs."
        );
      }

      console.error("Gemini 3.1 Flash Image Preview error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
