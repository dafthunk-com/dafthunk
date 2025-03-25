import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult, NodeContext, NodeType } from "../../workflowTypes";

/**
 * Stable Diffusion XL Base 1.0 node implementation for text-to-image generation
 */
export class StableDiffusionXLBaseNode10 extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-xl-base",
    name: "Stable Diffusion XL Base",
    type: "stable-diffusion-xl-base",
    description:
      "Generates high-quality images from text descriptions using Stable Diffusion XL Base 1.0",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
        value: undefined,
      },
      {
        name: "width",
        type: "number",
        description: "Width of the generated image (256-2048)",
        value: 1024,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the generated image (256-2048)",
        value: 1024,
      },
      {
        name: "num_steps",
        type: "number",
        description: "Number of diffusion steps (max 20)",
        value: 20,
      },
      {
        name: "guidance",
        type: "number",
        description:
          "Controls how closely the image follows the prompt (higher = more prompt-aligned)",
        value: 7.5,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducible results",
        value: undefined,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The generated image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
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
        return this.createErrorResult("Prompt is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Prepare the inputs for the model
      const inputs: Record<string, any> = {
        prompt,
      };

      // Add optional parameters if provided
      if (negative_prompt) inputs.negative_prompt = negative_prompt;
      if (width) inputs.width = Math.min(Math.max(width, 256), 2048);
      if (height) inputs.height = Math.min(Math.max(height, 256), 2048);
      if (num_steps) inputs.num_steps = Math.min(num_steps, 20);
      if (guidance) inputs.guidance = guidance;
      if (seed) inputs.seed = seed;

      // Run the Stable Diffusion XL Base model
      const result = await context.env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        inputs
      );

      // The result should be a binary image
      return this.createSuccessResult({
        image: result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
