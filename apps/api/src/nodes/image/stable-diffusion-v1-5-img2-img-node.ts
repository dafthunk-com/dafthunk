import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";

/**
 * Image Transformation node implementation using Stable Diffusion v1.5 img2img
 */
export class StableDiffusionV15Img2ImgNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-v1-5-img2img",
    name: "Stable Diffusion v1.5 Img2Img",
    type: "stable-diffusion-v1-5-img2img",
    description:
      "Transforms existing images based on text descriptions using Stable Diffusion v1.5 img2img",
    category: "Image",
    icon: "wand",
    computeCost: 10,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description:
          "A text description of how you want to transform the image",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description: "The input image to transform",
        required: true,
      },
      {
        name: "negative_prompt",
        type: "string",
        description:
          "Text describing elements to avoid in the transformed image",
        hidden: true,
      },
      {
        name: "strength",
        type: "number",
        description: "How strongly to apply the transformation (0-1)",
        value: 0.75,
        hidden: true,
      },
      {
        name: "guidance",
        type: "number",
        description:
          "Controls how closely the transformation should adhere to the prompt",
        value: 7.5,
        hidden: true,
      },
      {
        name: "num_steps",
        type: "number",
        description: "The number of diffusion steps (1-20)",
        value: 20,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The transformed image in PNG format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { image, prompt, negative_prompt, strength, guidance, num_steps } =
        context.inputs;

      if (!image || !image.data) {
        throw new Error("No input image data provided");
      }

      // Ensure numeric parameters are within valid ranges with defaults
      const validatedStrength = Math.min(Math.max(strength || 0.75, 0), 1);
      const validatedGuidance = guidance || 7.5;
      const validatedSteps = Math.floor(
        Math.min(Math.max(num_steps || 20, 1), 20)
      );

      // Convert image data to Uint8Array if it's not already
      const imageData =
        image.data instanceof Uint8Array
          ? image.data
          : new Uint8Array(image.data);

      // Call Cloudflare AI Stable Diffusion v1.5 img2img model
      const stream = (await context.env.AI.run(
        "@cf/runwayml/stable-diffusion-v1-5-img2img",
        {
          prompt: prompt || "enhance this image",
          negative_prompt: negative_prompt || "",
          image: Array.from(imageData), // Convert to regular array as required by the API
          strength: validatedStrength,
          guidance: validatedGuidance,
          num_steps: validatedSteps,
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

      return this.createSuccessResult({
        image: {
          data: uint8Array,
          mimeType: "image/png",
        },
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
