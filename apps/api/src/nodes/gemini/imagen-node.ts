import { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

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
    tags: ["Image", "AI"],
    icon: "image",
    documentation: `This node uses Google's Imagen model to generate high-fidelity images from text prompts.

## Usage Example

- **Input prompt**: \`"A beautiful sunset over mountains with golden hour lighting"\`
- **Input aspectRatio**: \`"16:9"\` (optional, default: "1:1")
- **Input sampleImageSize**: \`"2K"\` (optional, default: "1K")
- **Input personGeneration**: \`"allow_adult"\` (optional, default: "allow_adult")
- **Output**: A single generated image based on the prompt

## Supported Parameters

- **aspectRatio**: Image aspect ratio ("1:1", "3:4", "4:3", "9:16", "16:9", default: "1:1")
- **sampleImageSize**: Image size ("1K", "2K", default: "1K") - only for Standard and Ultra models
- **personGeneration**: Person generation policy ("dont_allow", "allow_adult", "allow_all", default: "allow_adult")

Note: "allow_all" is not available in EU, UK, CH, MENA locations.`,
    computeCost: 50,
    asTool: true,
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
      {
        name: "apiKey",
        type: "secret",
        description: "Gemini API key secret name",
        required: false,
        hidden: true,
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
    let ai: any;
    let response: any;

    try {
      const {
        apiKey,
        prompt,
        aspectRatio,
        sampleImageSize,
        personGeneration,
        model,
      } = context.inputs;

      // Use provided API key secret or fallback to environment variable
      const geminiApiKey =
        (apiKey && context.secrets?.[apiKey]) || context.env.GEMINI_API_KEY;

      if (!geminiApiKey) {
        return this.createErrorResult(
          "Gemini API key is required. Provide via apiKey input or GEMINI_API_KEY environment variable"
        );
      }

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

      ai = new GoogleGenAI({
        apiKey: geminiApiKey,
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

      response = await ai.models.generateImages({
        model: model || "imagen-4.0-generate-001",
        prompt: prompt,
        config: config,
      });

      // Extract all needed data immediately to avoid circular references
      let imageData: Uint8Array | null = null;
      let imageMimeType: string | null = null;
      let usageMetadata: any = null;
      let hasError = false;
      let errorMessage = "";

      try {
        if (!response?.generatedImages?.[0]?.image?.imageBytes) {
          hasError = true;
          errorMessage = "No images generated from Imagen API";
        } else {
          // Process the single generated image
          const generatedImage = response.generatedImages[0];

          // Convert base64 data to Uint8Array for proper object store handling
          imageData = Uint8Array.from(
            atob(generatedImage.image.imageBytes),
            (c) => c.charCodeAt(0)
          );
          imageMimeType = generatedImage.image.mimeType || "image/png";

          // Extract usage metadata if available
          usageMetadata = response.usageMetadata
            ? {
                promptTokenCount: response.usageMetadata.promptTokenCount,
                totalTokenCount: response.usageMetadata.totalTokenCount,
              }
            : null;
        }
      } catch (extractError) {
        hasError = true;
        errorMessage = "Error extracting response data";
        console.warn("Error extracting response data:", extractError);
      }

      // Dispose of response immediately after data extraction
      try {
        if (response && typeof (response as any).dispose === "function") {
          (response as any).dispose();
        }
        // Also try to dispose the models object
        if (ai.models && typeof (ai.models as any).dispose === "function") {
          (ai.models as any).dispose();
        }
        // And the client itself
        if (ai && typeof (ai as any).dispose === "function") {
          (ai as any).dispose();
        }
      } catch (disposeError) {
        console.warn("Failed to dispose response:", disposeError);
      }

      // Return result based on extracted data
      if (hasError) {
        return this.createErrorResult(errorMessage);
      }

      return this.createSuccessResult({
        image: {
          data: imageData!,
          mimeType: imageMimeType!,
        },
        ...(usageMetadata && { usage_metadata: usageMetadata }),
      });
    } catch (error) {
      console.error("Imagen error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
