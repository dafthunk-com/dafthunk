import { ExecutableNode } from "../executableNode";
import { ExecutionResult, NodeContext } from "../../types";
import {
  ImageNodeParameter,
  StringNodeParameter,
  NumberNodeParameter,
} from "../nodeParameterTypes";
import { NodeType } from "../nodeTypes";

/**
 * Stable Diffusion XL Base 1.0 node implementation for text-to-image generation
 */
export class StableDiffusionXLBase10Node extends ExecutableNode {
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
        type: StringNodeParameter,
        description: "Text description of the image to generate",
        required: true,
      },
      {
        name: "negative_prompt",
        type: StringNodeParameter,
        description: "Text describing elements to avoid in the generated image",
        value: undefined,
        hidden: true,
      },
      {
        name: "width",
        type: NumberNodeParameter,
        description: "Width of the generated image (256-2048)",
        value: new NumberNodeParameter(1024),
        hidden: true,
      },
      {
        name: "height",
        type: NumberNodeParameter,
        description: "Height of the generated image (256-2048)",
        value: new NumberNodeParameter(1024),
        hidden: true,
      },
      {
        name: "num_steps",
        type: NumberNodeParameter,
        description: "Number of diffusion steps (max 20)",
        value: new NumberNodeParameter(20),
        hidden: true,
      },
      {
        name: "guidance",
        type: NumberNodeParameter,
        description:
          "Controls how closely the image follows the prompt (higher = more prompt-aligned)",
        value: new NumberNodeParameter(7.5),
        hidden: true,
      },
      {
        name: "seed",
        type: NumberNodeParameter,
        description: "Random seed for reproducible results",
        value: undefined,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageNodeParameter,
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

      // Get default values from node type definition
      const defaultWidth = StableDiffusionXLBase10Node.nodeType.inputs
        .find((i) => i.name === "width")
        ?.value?.getValue() as number;
      const defaultHeight = StableDiffusionXLBase10Node.nodeType.inputs
        .find((i) => i.name === "height")
        ?.value?.getValue() as number;
      const defaultNumSteps = StableDiffusionXLBase10Node.nodeType.inputs
        .find((i) => i.name === "num_steps")
        ?.value?.getValue() as number;
      const defaultGuidance = StableDiffusionXLBase10Node.nodeType.inputs
        .find((i) => i.name === "guidance")
        ?.value?.getValue() as number;

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
      const inputs: Record<string, any> = {
        prompt,
        width: validatedWidth,
        height: validatedHeight,
        num_steps: validatedSteps,
        guidance: validatedGuidance,
      };

      // Add optional parameters if provided
      if (negative_prompt) inputs.negative_prompt = negative_prompt;
      if (seed) inputs.seed = seed;

      // Run the Stable Diffusion XL Base model
      const stream = (await context.env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        inputs
      )) as ReadableStream;

      const response = new Response(stream);
      const blob = await response.blob();

      const buffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      if (uint8Array.length === 0) {
        throw new Error("Received empty image data from the API");
      }

      return this.createSuccessResult({
        image: new ImageNodeParameter({
          data: uint8Array,
          mimeType: "image/jpeg",
        }),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
