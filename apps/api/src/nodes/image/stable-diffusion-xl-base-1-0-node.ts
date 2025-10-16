import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Stable Diffusion XL Base 1.0 node implementation for text-to-image generation
 */
export class StableDiffusionXLBase10Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-xl-base-1-0",
    name: "Image Generation (SDXL Base)",
    type: "stable-diffusion-xl-base-1-0",
    description:
      "Generates high-quality images from text descriptions using Stable Diffusion XL Base 1.0",
    tags: ["Image", "AI"],
    icon: "image",
    documentation:
      "This node generates high-quality images from text descriptions using Stable Diffusion XL Base 1.0 model.",
    computeCost: 10,
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
        value: undefined,
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
        description: "Number of diffusion steps (max 20)",
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
        description: "The generated image",
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
        return this.createErrorResult("Prompt is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Get default values from node type definition
      const defaultWidth = StableDiffusionXLBase10Node.nodeType.inputs.find(
        (i) => i.name === "width"
      )?.value as number;
      const defaultHeight = StableDiffusionXLBase10Node.nodeType.inputs.find(
        (i) => i.name === "height"
      )?.value as number;
      const defaultNumSteps = StableDiffusionXLBase10Node.nodeType.inputs.find(
        (i) => i.name === "num_steps"
      )?.value as number;
      const defaultGuidance = StableDiffusionXLBase10Node.nodeType.inputs.find(
        (i) => i.name === "guidance"
      )?.value as number;

      // Validate and normalize dimensions
      const validatedWidth = Math.min(
        Math.max(width ?? defaultWidth, 256),
        2048
      );
      const validatedHeight = Math.min(
        Math.max(height ?? defaultHeight, 256),
        2048
      );
      const validatedSteps = Math.min(num_steps ?? defaultNumSteps, 20);
      const validatedGuidance = guidance ?? defaultGuidance;

      // Prepare the inputs for the model
      const params: AiTextToImageInput = {
        prompt,
        width: validatedWidth,
        height: validatedHeight,
        num_steps: validatedSteps,
        guidance: validatedGuidance,
      };

      // Add optional parameters if provided
      if (negative_prompt) params.negative_prompt = negative_prompt;
      if (seed) params.seed = seed;

      // Run the Stable Diffusion XL Base model
      const stream = (await context.env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        params,
        context.env.AI_OPTIONS
      )) as ReadableStream;

      const response = new Response(stream);
      const blob = await response.blob();

      const buffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      if (uint8Array.length === 0) {
        throw new Error("Received empty image data from the API");
      }

      return this.createSuccessResult({
        image: {
          data: uint8Array,
          mimeType: "image/jpeg",
        },
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
