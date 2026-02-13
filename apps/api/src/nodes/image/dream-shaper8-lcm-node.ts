import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: DreamShaper 8 LCM image generation
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.1,
  outputCostPerMillion: 15.0, // Image generation model
};

/**
 * DreamShaper 8 LCM node implementation for text-to-image generation
 */
export class DreamShaper8LCMNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dream-shaper8-lcm",
    name: "Image Generation (DreamShaper)",
    type: "dream-shaper8-lcm",
    description:
      "Generates images from text descriptions using the DreamShaper 8 LCM model",
    tags: ["AI", "Image", "Cloudflare", "Generate"],
    icon: "image",
    documentation:
      "This node generates images from text descriptions using the Dream Shaper 8 LCM model for fast and creative image generation.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/dreamshaper-8-lcm/",
    usage: 1,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
        required: true,
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
        hidden: true,
      },
      {
        name: "width",
        type: "number",
        description: "Width of the generated image (256-2048)",
        value: 1024,
        hidden: true,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the generated image (256-2048)",
        value: 1024,
        hidden: true,
      },
      {
        name: "num_steps",
        type: "number",
        description: "Number of diffusion steps (1-20)",
        value: 20,
        hidden: true,
      },
      {
        name: "guidance",
        type: "number",
        description:
          "Controls how closely the image follows the prompt (higher = more prompt-aligned)",
        value: 7.5,
        hidden: true,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducible results",
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
      const {
        prompt,
        negative_prompt,
        width,
        height,
        num_steps,
        guidance,
        seed,
      } = context.inputs;

      if (!prompt) {
        return this.createErrorResult(
          "Prompt is required for image generation"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Get default values from node type definition
      const defaultWidth = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "width"
      )?.value as number;
      const defaultHeight = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "height"
      )?.value as number;
      const defaultNumSteps = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "num_steps"
      )?.value as number;
      const defaultGuidance = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "guidance"
      )?.value as number;

      // Validate and prepare inputs
      const validatedWidth = Math.min(
        Math.max(width ?? defaultWidth, 256),
        2048
      );
      const validatedHeight = Math.min(
        Math.max(height ?? defaultHeight, 256),
        2048
      );
      const validatedNumSteps = Math.min(num_steps ?? defaultNumSteps, 20);
      const validatedGuidance = guidance ?? defaultGuidance;

      // Prepare the inputs for the model
      const inputs: AiTextToImageInput = {
        prompt,
        width: validatedWidth,
        height: validatedHeight,
        num_steps: validatedNumSteps,
        guidance: validatedGuidance,
      };

      // Add optional parameters if provided
      if (negative_prompt) inputs.negative_prompt = negative_prompt;
      if (seed) inputs.seed = seed;

      // Run the DreamShaper 8 LCM model
      const stream = (await context.env.AI.run(
        "@cf/lykon/dreamshaper-8-lcm",
        inputs,
        context.env.AI_OPTIONS
      )) as ReadableStream;

      if (!stream) {
        return this.createErrorResult(
          "Failed to generate image: No response from AI service"
        );
      }

      const response = new Response(stream);
      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        return this.createErrorResult(
          "Failed to generate image: Empty response"
        );
      }

      const buffer = await blob.arrayBuffer();

      // Calculate usage based on prompt and image size
      const imageData = new Uint8Array(buffer);
      // Estimate image as output bytes / 1000 (rough approximation)
      const imageTokenEstimate = Math.ceil(imageData.length / 1000);
      const usage = calculateTokenUsage(
        prompt || "",
        imageTokenEstimate,
        PRICING
      );

      return this.createSuccessResult(
        {
          image: {
            data: imageData,
            mimeType: "image/jpeg",
          },
        },
        usage
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to generate image"
      );
    }
  }
}
