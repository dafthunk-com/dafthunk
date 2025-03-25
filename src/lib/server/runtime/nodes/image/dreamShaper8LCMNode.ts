import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult, NodeContext, NodeType } from "../../workflowTypes";

/**
 * DreamShaper 8 LCM node implementation for text-to-image generation
 */
export class DreamShaper8LCMNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dreamshaper-8-lcm",
    name: "DreamShaper 8 LCM",
    type: "dreamshaper-8-lcm",
    description: "Generates images from text descriptions using the DreamShaper 8 LCM model",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
      },
      {
        name: "width",
        type: "number",
        description: "Width of the generated image (256-2048)",
        value: 1024,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the generated image (256-2048)",
        value: 1024,
      },
      {
        name: "num_steps",
        type: "number",
        description: "Number of diffusion steps (1-20)",
        value: 20,
      },
      {
        name: "guidance",
        type: "number",
        description: "Controls how closely the image follows the prompt (higher = more prompt-aligned)",
        value: 7.5,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducible results",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
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
        return this.createErrorResult("Prompt is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Get default values from node type definition
      const defaultWidth = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "width"
      )?.value as number;
      const defaultHeight = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "height"
      )?.value as number;
      const defaultNumSteps = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "num_steps"
      )?.value as number;
      const defaultGuidance = DreamShaper8LCMNode.nodeType.inputs.find(
        (i) => i.name === "guidance"
      )?.value as number;

      // Prepare the inputs for the model
      const inputs: Record<string, any> = {
        prompt,
        width: Math.min(Math.max(width ?? defaultWidth, 256), 2048),
        height: Math.min(Math.max(height ?? defaultHeight, 256), 2048),
        num_steps: Math.min(num_steps ?? defaultNumSteps, 20),
        guidance: guidance ?? defaultGuidance,
      };

      // Add optional parameters if provided
      if (negative_prompt) inputs.negative_prompt = negative_prompt;
      if (seed) inputs.seed = seed;

      // Run the DreamShaper 8 LCM model
      const stream = (await context.env.AI.run(
        "@cf/lykon/dreamshaper-8-lcm",
        inputs
      )) as ReadableStream;

      const response = new Response(stream);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      return this.createSuccessResult({
        image: {
          data: Array.from(new Uint8Array(buffer)),
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