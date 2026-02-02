import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: SDXL Lightning image generation
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.1,
  outputCostPerMillion: 20.0, // Higher for image generation
};

/**
 * Image Generation node implementation using Stable Diffusion XL Lightning
 */
export class StableDiffusionXLLightningNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-xl-lightning",
    name: "Image Generation (SDXL Lightning)",
    type: "stable-diffusion-xl-lightning",
    description:
      "Generates images from text descriptions using Stable Diffusion XL Lightning",
    tags: ["AI", "Image", "Cloudflare", "StableDiffusion", "Generate"],
    icon: "wand",
    documentation:
      "This node generates images rapidly from text descriptions using Stable Diffusion XL Lightning model for fast image generation.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/",
    usage: 1,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "A text description of the image you want to generate",
        required: true,
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
        hidden: true,
      },
      {
        name: "height",
        type: "number",
        description: "The height of the generated image in pixels (256-2048)",
        value: 1024,
        hidden: true,
      },
      {
        name: "width",
        type: "number",
        description: "The width of the generated image in pixels (256-2048)",
        value: 1024,
        hidden: true,
      },
      {
        name: "num_steps",
        type: "number",
        description: "The number of diffusion steps (1-20)",
        value: 20,
        hidden: true,
      },
      {
        name: "guidance",
        type: "number",
        description:
          "Controls how closely the generated image should adhere to the prompt",
        value: 7.5,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The generated image in JPEG format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { prompt, negative_prompt, height, width, num_steps, guidance } =
        context.inputs;

      // Validate inputs
      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Ensure numeric parameters are within valid ranges
      const validatedHeight = Math.min(Math.max(height || 1024, 256), 2048);
      const validatedWidth = Math.min(Math.max(width || 1024, 256), 2048);
      const validatedSteps = Math.min(Math.max(num_steps || 20, 1), 20);
      const validatedGuidance = guidance || 7.5;

      // Call Cloudflare AI SDXL-Lightning model
      const stream = (await context.env.AI.run(
        "@cf/bytedance/stable-diffusion-xl-lightning",
        {
          prompt,
          negative_prompt: negative_prompt || "",
          height: validatedHeight,
          width: validatedWidth,
          num_steps: validatedSteps,
          guidance: validatedGuidance,
        },
        context.env.AI_OPTIONS
      )) as ReadableStream;

      const response = new Response(stream);
      const blob = await response.blob();

      const buffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      if (uint8Array.length === 0) {
        throw new Error("Received empty image data from the API");
      }

      // Calculate usage based on prompt and image size
      // Estimate image as output bytes / 1000 (rough approximation)
      const imageTokenEstimate = Math.ceil(uint8Array.length / 1000);
      const usage = calculateTokenUsage(
        prompt || "",
        imageTokenEstimate,
        PRICING
      );

      // Return the image data and MIME type - the runtime will handle storage
      return this.createSuccessResult(
        {
          image: {
            data: uint8Array,
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
