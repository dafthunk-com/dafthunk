import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Image Inpainting node implementation using Stable Diffusion v1.5
 */
export class StableDiffusionV15InpaintingNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "stable-diffusion-v1-5-inpainting",
    name: "Stable Diffusion v1.5 Inpainting",
    type: "stable-diffusion-v1-5-inpainting",
    description:
      "Generates images by inpainting masked areas using Stable Diffusion v1.5",
    category: "Image",
    icon: "brush",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description:
          "A text description of what to generate in the masked area",
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
        description:
          "Controls how closely the generated image should adhere to the prompt",
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

      // Debug logs for input data
      console.log("Input image data length:", imageData.length);
      console.log(
        "First few bytes of image:",
        Array.from(imageData.slice(0, 10))
      );
      console.log("Mask data length:", maskData.length);
      console.log(
        "First few bytes of mask:",
        Array.from(maskData.slice(0, 10))
      );

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
          ...(seed !== undefined && { seed }),
        }
      )) as ReadableStream;

      // Debug log
      console.log("API call completed, processing response...");

      const response = new Response(stream);
      const blob = await response.blob();
      console.log("Response blob size:", blob.size);

      const buffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Debug log
      console.log("Output image data length:", uint8Array.length);
      console.log(
        "First few bytes of output:",
        Array.from(uint8Array.slice(0, 10))
      );

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
      console.error("StableDiffusionV15InpaintingNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
