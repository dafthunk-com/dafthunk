import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
/**
 * FLUX.1 schnell node implementation for text-to-image generation
 */
export class Flux1SchnellNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "flux-1-schnell",
    name: "Image Generation (FLUX)",
    type: "flux-1-schnell",
    description:
      "Generates images from text descriptions using the FLUX.1 schnell model",
    tags: ["Image", "AI"],
    icon: "image",
    documentation: "*Missing detailed documentation*",
    computeCost: 10,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
        required: true,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of diffusion steps (default: 4, max: 8)",
        value: 4,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The generated image in base64 format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { prompt, steps } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the FLUX.1 schnell model for text-to-image generation
      const result = await context.env.AI.run(
        "@cf/black-forest-labs/flux-1-schnell",
        {
          prompt,
          steps,
        },
        context.env.AI_OPTIONS
      );

      // Convert base64 string to Uint8Array
      const binaryString = atob(result.image as string);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return this.createSuccessResult({
        image: {
          data: bytes,
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
