import { NodeContext, ExecutionResult } from "../../types";
import { ExecutableNode } from "../types";
import {
  ImageNodeParameter,
  NumberNodeParameter,
  StringNodeParameter,
} from "../types";
import { NodeType } from "../types";

/**
 * Image Generation node implementation using Stable Diffusion XL Lightning
 */
export class StableDiffusionXLLightningNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-xl-lightning",
    name: "Stable Diffusion XL Lightning",
    type: "image-generation",
    description:
      "Generates images from text descriptions using Stable Diffusion XL Lightning",
    category: "Image",
    icon: "wand",
    inputs: [
      {
        name: "prompt",
        type: StringNodeParameter,
        description: "A text description of the image you want to generate",
        required: true,
      },
      {
        name: "negative_prompt",
        type: StringNodeParameter,
        description: "Text describing elements to avoid in the generated image",
        hidden: true,
      },
      {
        name: "height",
        type: NumberNodeParameter,
        description: "The height of the generated image in pixels (256-2048)",
        value: new NumberNodeParameter(1024),
        hidden: true,
      },
      {
        name: "width",
        type: NumberNodeParameter,
        description: "The width of the generated image in pixels (256-2048)",
        value: new NumberNodeParameter(1024),
        hidden: true,
      },
      {
        name: "num_steps",
        type: NumberNodeParameter,
        description: "The number of diffusion steps (1-20)",
        value: new NumberNodeParameter(20),
        hidden: true,
      },
      {
        name: "guidance",
        type: NumberNodeParameter,
        description:
          "Controls how closely the generated image should adhere to the prompt",
        value: new NumberNodeParameter(7.5),
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

      // Prepare inputs for the model
      const inputs = {
        prompt,
        negative_prompt: negative_prompt || "",
        height: validatedHeight,
        width: validatedWidth,
        num_steps: validatedSteps,
        guidance: validatedGuidance,
      };

      // Call Cloudflare AI SDXL-Lightning model
      const stream = (await context.env.AI.run(
        "@cf/bytedance/stable-diffusion-xl-lightning",
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
