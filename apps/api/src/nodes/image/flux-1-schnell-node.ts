import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: FLUX.1 schnell image generation
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.1,
  outputCostPerMillion: 25.0, // Higher for image generation
};
/**
 * FLUX.1 schnell node implementation for text-to-image generation
 */
export class Flux1SchnellNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "flux-1-schnell",
    name: "Image Generation (FLUX)",
    type: "flux-1-schnell",
    description:
      "Generates images from text descriptions using the FLUX.1 schnell model",
    tags: ["AI", "Image", "Cloudflare", "Flux", "Generate"],
    icon: "image",
    documentation:
      "This node generates images from text descriptions using the Flux 1 Schnell model for rapid image creation.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/",
    usage: 1,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
        required: true,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of diffusion steps (default: 4, max: 8)",
        value: 4,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The generated image in base64 format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { prompt, steps } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the FLUX.1 schnell model for text-to-image generation
      const result = await context.env.AI.run(
        "@cf/black-forest-labs/flux-1-schnell",
        {
          prompt,
          steps,
        },
        context.env.AI_OPTIONS
      );

      // Convert base64 string to Uint8Array
      const binaryString = atob(result.image as string);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Calculate usage based on prompt and image size
      // Estimate image as output bytes / 1000 (rough approximation)
      const imageTokenEstimate = Math.ceil(bytes.length / 1000);
      const usage = calculateTokenUsage(
        prompt || "",
        imageTokenEstimate,
        PRICING
      );

      return this.createSuccessResult(
        {
          image: {
            data: bytes,
            mimeType: "image/jpeg",
          },
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
