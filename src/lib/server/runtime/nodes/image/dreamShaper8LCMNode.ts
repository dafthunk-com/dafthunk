import { ExecutableNode } from "../types";
import { ExecutionResult, NodeContext } from "../../types";
import {
  ImageNodeParameter,
  StringNodeParameter,
  NumberNodeParameter,
} from "../types";
import { NodeType } from "../types";

/**
 * DreamShaper 8 LCM node implementation for text-to-image generation
 */
export class DreamShaper8LCMNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dreamshaper-8-lcm",
    name: "DreamShaper 8 LCM",
    type: "dreamshaper-8-lcm",
    description:
      "Generates images from text descriptions using the DreamShaper 8 LCM model",
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
        description: "Number of diffusion steps (1-20)",
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
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageNodeParameter,
        description: "The generated image in JPEG format",
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
        return this.createErrorResult(
          "Prompt is required for image generation"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Get default values from node type definition
      const defaultWidth = DreamShaper8LCMNode.nodeType.inputs
        .find((i) => i.name === "width")
        ?.value?.getValue() as number;
      const defaultHeight = DreamShaper8LCMNode.nodeType.inputs
        .find((i) => i.name === "height")
        ?.value?.getValue() as number;
      const defaultNumSteps = DreamShaper8LCMNode.nodeType.inputs
        .find((i) => i.name === "num_steps")
        ?.value?.getValue() as number;
      const defaultGuidance = DreamShaper8LCMNode.nodeType.inputs
        .find((i) => i.name === "guidance")
        ?.value?.getValue() as number;

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
      const inputs: Record<string, any> = {
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
        inputs
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

      return this.createSuccessResult({
        image: new ImageNodeParameter({
          data: new Uint8Array(buffer),
          mimeType: "image/jpeg",
        }),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to generate image"
      );
    }
  }
}
