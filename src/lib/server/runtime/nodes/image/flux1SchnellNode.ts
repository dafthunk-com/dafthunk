import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult, NodeContext, NodeType } from "../../workflowTypes";

/**
 * FLUX.1 schnell node implementation for text-to-image generation
 */
export class Flux1SchnellNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "flux-1-schnell",
    name: "FLUX.1 Schnell",
    type: "flux-1-schnell",
    description: "Generates images from text descriptions using the FLUX.1 schnell model",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
      },
      {
        name: "steps",
        type: "number",
        description: "Number of diffusion steps (default: 4, max: 8)",
        value: 4,
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

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const prompt = context.inputs.prompt;
      const steps = context.inputs.steps as number | undefined;

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the FLUX.1 schnell model for text-to-image generation
      const result = await context.env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt,
        ...(steps && { steps }),
      });

      // Convert base64 string to Uint8Array
      const binaryString = atob(result.image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return this.createSuccessResult({
        image: {
          data: Array.from(bytes),
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