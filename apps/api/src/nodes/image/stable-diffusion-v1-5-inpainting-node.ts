import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";
/**
 * Image Inpainting node implementation using Stable Diffusion v1.5
 */
export class StableDiffusionV15InpaintingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-v1-5-inpainting",
    name: "Image Inpainting (SD v1.5)",
    type: "stable-diffusion-v1-5-inpainting",
    description:
      "Generates images by inpainting masked areas using Stable Diffusion v1.5",
    tags: ["Image", "AI"],
    icon: "brush",
    documentation:
      "This node fills in missing or masked areas of images using Stable Diffusion v1.5 inpainting model.",
    referenceUrl: "https://developers.cloudflare.com/workers-ai/models/stable-diffusion-v1-5-inpainting/",
    computeCost: 10,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description:
          "A text description of what to generate in the masked area",
        required: true,
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
        hidden: true,
      },
      {
        name: "image",
        type: "image",
        description: "The input image to inpaint",
      },
      {
        name: "mask",
        type: "image",
        description: "The mask image where white areas (255) will be inpainted",
      },
      {
        name: "num_steps",
        type: "number",
        description: "The number of diffusion steps (1-20)",
        value: 20,
        hidden: true,
      },
      {
        name: "strength",
        type: "number",
        description: "How strongly to apply the transformation (0-1)",
        value: 1,
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
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducibility",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The inpainted image in PNG format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const {
        prompt,
        negative_prompt,
        image,
        mask,
        num_steps,
        strength,
        guidance,
        seed,
      } = context.inputs;

      // Validate required inputs
      if (!prompt) {
        throw new Error("Prompt is required");
      }
      if (!image?.data) {
        throw new Error("Input image is required");
      }
      if (!mask?.data) {
        throw new Error("Mask image is required");
      }

      // Ensure numeric parameters are within valid ranges
      const validatedSteps = Math.min(Math.max(num_steps || 20, 1), 20);
      const validatedStrength = Math.min(Math.max(strength || 1, 0), 1);
      const validatedGuidance = guidance || 7.5;

      // Convert image and mask data to Uint8Array if they're not already
      const imageData =
        image.data instanceof Uint8Array
          ? image.data
          : new Uint8Array(image.data);
      const maskData =
        mask.data instanceof Uint8Array ? mask.data : new Uint8Array(mask.data);

      // Call Cloudflare AI Stable Diffusion Inpainting model
      const stream = (await context.env.AI.run(
        "@cf/runwayml/stable-diffusion-v1-5-inpainting",
        {
          prompt,
          negative_prompt: negative_prompt || "",
          image: Array.from(imageData),
          mask: Array.from(maskData),
          num_steps: validatedSteps,
          strength: validatedStrength,
          guidance: validatedGuidance,
          seed: seed !== undefined ? seed : undefined,
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
