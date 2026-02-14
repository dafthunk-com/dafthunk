import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/pricing (Gemini 2.5 Flash image generation)
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.3,
  outputCostPerMillion: 2.5,
};

/**
 * Gemini 2.5 Flash Image Preview node implementation using the Google GenAI SDK
 * Generates images from text prompts and optional input images
 */
export class Gemini25FlashImagePreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-image-preview",
    name: "Gemini 2.5 Flash Image Preview",
    type: "gemini-2-5-flash-image-preview",
    description: "Generates images from text prompts and optional input images",
    tags: ["AI", "Image", "Google", "Gemini", "Preview"],
    icon: "image",
    documentation:
      "This node uses Google's Gemini 2.5 Flash Image Preview model to generate images from text prompts and optional input images.",
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
        hidden: false,
      },
      {
        name: "image2",
        type: "image",
        description:
          "Optional second input image for multi-image composition or style transfer",
        required: false,
        hidden: false,
      },
      {
        name: "image3",
        type: "image",
        description:
          "Optional third input image for multi-image composition (works best with up to 3 images)",
        required: false,
        hidden: false,
      },
      {
        name: "aspectRatio",
        type: "string",
        description: "Aspect ratio of generated images (1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9)",
        required: false,
        hidden: true,
        value: "1:1",
      },
      {
        name: "imageSize",
        type: "string",
        description: "Size of generated images (1K or 2K)",
        required: false,
        hidden: true,
        value: "1K",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Generated image from Gemini 2.5 Flash Image Preview",
      },
      /*
      {
        name: "candidates",
        type: "json",
        description: "Full response candidates from Gemini API",
        hidden: true,
      },
      */
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
    let ai: any;
    let response: any;

    try {
      const { prompt, image1, image2, image3, aspectRatio, imageSize } =
        context.inputs;

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      // Validate aspect ratio
      const validAspectRatios = [
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9",
      ];
      if (aspectRatio && !validAspectRatios.includes(aspectRatio)) {
        return this.createErrorResult(
          `Invalid aspectRatio. Must be one of: ${validAspectRatios.join(", ")}`
        );
      }

      // Validate image size (2.5 Flash supports up to 2K)
      const validSizes = ["1K", "2K"];
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

      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: promptData,
        config,
      });

      // Extract all needed data immediately to avoid circular references
      let imageData: Uint8Array | null = null;
      let imageMimeType: string | null = null;
      let usageMetadata: any = null;
      let promptFeedback: any = null;
      let finishReason: string | null = null;
      let candidate: any = null;
      let hasError = false;
      let errorMessage = "";

      try {
        // Process the response to find generated image
        if (!response?.candidates?.[0]?.content?.parts) {
          hasError = true;
          errorMessage = "No response generated from Gemini API";
        } else {
          candidate = response.candidates[0];
          const content = candidate.content;

          if (!content?.parts) {
            hasError = true;
            errorMessage = "Invalid response structure from Gemini API";
          } else {
            // Look for generated image in response
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

            if (!imageData) {
              // If no image found, check for text response
              for (const part of content.parts) {
                if (part?.text) {
                  hasError = true;
                  errorMessage = `No image generated. Text response: ${part.text}`;
                  break;
                }
              }

              if (!hasError) {
                hasError = true;
                errorMessage = "No image or text generated in response";
              }
            } else {
              // Extract metadata safely
              usageMetadata = response.usageMetadata
                ? {
                    promptTokenCount: response.usageMetadata.promptTokenCount,
                    candidatesTokenCount:
                      response.usageMetadata.candidatesTokenCount,
                    totalTokenCount: response.usageMetadata.totalTokenCount,
                  }
                : null;

              promptFeedback = response.promptFeedback
                ? {
                    blockReason: response.promptFeedback.blockReason,
                    safetyRatings: response.promptFeedback.safetyRatings,
                  }
                : null;

              finishReason = candidate.finishReason || null;
            }
          }
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
      if (hasError || !imageData || !imageMimeType) {
        return this.createErrorResult(errorMessage);
      }

      // Calculate usage based on token counts
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
          ...(candidate && { candidates: [candidate] }),
          ...(usageMetadata && { usage_metadata: usageMetadata }),
          ...(promptFeedback && { prompt_feedback: promptFeedback }),
          ...(finishReason && { finish_reason: finishReason }),
        },
        usage
      );
    } catch (error) {
      console.error("Gemini Image Preview error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
