import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Image Inpainting node implementation using Stable Diffusion v1.5
 */
export class ImageInpaintingNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "image-inpainting",
    name: "Image Inpainting",
    type: "image-inpainting",
    description: "Generates images by inpainting masked areas using Stable Diffusion v1.5",
    category: "AI",
    icon: "brush",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "A text description of what to generate in the masked area",
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
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
      },
      {
        name: "strength",
        type: "number",
        description: "How strongly to apply the transformation (0-1)",
        value: 1,
      },
      {
        name: "guidance",
        type: "number",
        description: "Controls how closely the generated image should adhere to the prompt",
        value: 7.5,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducibility",
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

  async execute(context: NodeContext): Promise<ExecutionResult> {
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
        seed 
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

      // Call Cloudflare AI Stable Diffusion Inpainting model
      const stream = (await context.env.AI.run(
        "@cf/runwayml/stable-diffusion-v1-5-inpainting",
        {
          prompt,
          negative_prompt: negative_prompt || "",
          image: image.data,
          mask: mask.data,
          num_steps: validatedSteps,
          strength: validatedStrength,
          guidance: validatedGuidance,
          ...(seed !== undefined && { seed }),
        }
      )) as ReadableStream;

      const response = new Response(stream);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      return this.createSuccessResult({
        image: {
          data: Array.from(new Uint8Array(buffer)),
          mimeType: "image/png",
        },
      });
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 