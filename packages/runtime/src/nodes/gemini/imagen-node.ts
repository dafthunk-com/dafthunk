import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/pricing (Imagen 4: ~$0.04 per image, using token estimation)
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.3,
  outputCostPerMillion: 40.0, // Higher output cost to account for image generation
};

/**
 * Imagen node implementation using the Google GenAI SDK
 * Generates high-fidelity images from text prompts
 */
export class ImagenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "imagen",
    name: "Imagen",
    type: "imagen",
    description:
      "Generates high-fidelity images from text prompts using Google's Imagen model",
    tags: ["AI", "Image", "Google", "Gemini", "Generate"],
    icon: "image",
    documentation:
      "This node uses Google's Imagen model to generate high-fidelity images from text prompts.",
    usage: 1,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description:
          "Text prompt describing the image to generate (max 480 tokens)",
        required: true,
      },
      {
        name: "aspectRatio",
        type: "string",
        description: "Aspect ratio of generated images",
        required: false,
        hidden: true,
        value: "1:1",
      },
      {
        name: "sampleImageSize",
        type: "string",
        description: "Size of generated images (1K or 2K)",
        required: false,
        hidden: true,
        value: "1K",
      },
      {
        name: "personGeneration",
        type: "string",
        description: "Person generation policy",
        required: false,
        hidden: true,
        value: "allow_adult",
      },
      {
        name: "model",
        type: "string",
        description: "Imagen model to use",
        required: false,
        hidden: true,
        value: "imagen-4.0-generate-001",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Generated image from Imagen",
      },
      {
        name: "usage_metadata",
        type: "json",
        description: "Token usage and cost information",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { prompt, aspectRatio, sampleImageSize, personGeneration, model } =
        context.inputs;

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      if (aspectRatio && !validAspectRatios.includes(aspectRatio)) {
        return this.createErrorResult(
          `Invalid aspectRatio. Must be one of: ${validAspectRatios.join(", ")}`
        );
      }

      const validSizes = ["1K", "2K"];
      if (sampleImageSize && !validSizes.includes(sampleImageSize)) {
        return this.createErrorResult(
          `Invalid sampleImageSize. Must be one of: ${validSizes.join(", ")}`
        );
      }

      const validPersonGeneration = ["dont_allow", "allow_adult", "allow_all"];
      if (
        personGeneration &&
        !validPersonGeneration.includes(personGeneration)
      ) {
        return this.createErrorResult(
          `Invalid personGeneration. Must be one of: ${validPersonGeneration.join(", ")}`
        );
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const ai = new GoogleGenAI({
        apiKey: "gateway-managed",
        ...getGoogleAIConfig(context.env),
      });

      // Build configuration object
      const config: any = {
        numberOfImages: 1, // Always generate exactly one image
        aspectRatio: aspectRatio || "1:1",
        personGeneration: personGeneration || "allow_adult",
      };

      // Add sampleImageSize only if specified (not supported by all models)
      if (sampleImageSize) {
        config.sampleImageSize = sampleImageSize;
      }

      const response = await ai.models.generateImages({
        model: model || "imagen-4.0-generate-001",
        prompt: prompt,
        config: config,
      });

      if (!response?.generatedImages?.[0]?.image?.imageBytes) {
        return this.createErrorResult("No images generated from Imagen API");
      }

      // Process the single generated image — guard above ensures this path exists
      const image = response.generatedImages[0].image;
      const imageBytes = image?.imageBytes;
      if (!image || !imageBytes) {
        return this.createErrorResult("No images generated from Imagen API");
      }

      // Convert base64 data to Uint8Array for proper object store handling
      const imageData = Uint8Array.from(atob(imageBytes), (c) =>
        c.charCodeAt(0)
      );
      const imageMimeType = image.mimeType || "image/png";

      // Extract usage metadata if available
      const responseAny = response as any;
      const usageMetadata = responseAny.usageMetadata
        ? {
            promptTokenCount: responseAny.usageMetadata.promptTokenCount,
            totalTokenCount: responseAny.usageMetadata.totalTokenCount,
          }
        : null;

      // Calculate usage based on token counts
      const usage = calculateTokenUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.totalTokenCount ?? 1000, // Imagen doesn't return candidatesTokenCount, use totalTokenCount
        PRICING
      );

      return this.createSuccessResult(
        {
          image: {
            data: imageData,
            mimeType: imageMimeType,
          },
          ...(usageMetadata && { usage_metadata: usageMetadata }),
        },
        usage
      );
    } catch (error) {
      console.error("Imagen error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
