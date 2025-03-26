import { NodeContext, ExecutionResult, NodeType } from "../../runtimeTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Image-to-Text node implementation using LLaVA 1.5 7B HF
 */
export class LLaVA157BHFNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "image-to-text",
    name: "Image to Text (LLaVA 1.5 7B)",
    type: "image-to-text",
    description:
      "Generates text descriptions from images using LLaVA 1.5 7B model",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to generate a description for",
        required: true,
      },
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for guiding the model's response",
        value: "Generate a caption for this image",
        hidden: true,
      },
      {
        name: "max_tokens",
        type: "number",
        description: "The maximum number of tokens to generate in the response",
        value: 512,
        hidden: true,
      },
      {
        name: "temperature",
        type: "number",
        description:
          "Controls the randomness of the output; higher values produce more random results",
        value: 0.7,
        hidden: true,
      },
      {
        name: "top_p",
        type: "number",
        description:
          "Controls the diversity of outputs by limiting to the most probable tokens",
        value: 0.95,
        hidden: true,
      },
      {
        name: "top_k",
        type: "number",
        description:
          "Limits the AI to choose from the top 'k' most probable words",
        value: 40,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "description",
        type: "string",
        description: "The generated text description of the image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { image, prompt, max_tokens, temperature, top_p, top_k } =
        context.inputs;

      // Prepare the image data - convert to array of numbers
      const imageData = Array.from(new Uint8Array(image.data));

      // Prepare parameters for the model
      const params: any = {
        image: imageData,
        prompt,
        max_tokens,
      };

      // Add optional parameters if provided
      if (temperature !== undefined) params.temperature = temperature;
      if (top_p !== undefined) params.top_p = top_p;
      if (top_k !== undefined) params.top_k = top_k;

      // Call Cloudflare AI LLaVA model
      const response = await context.env.AI.run(
        "@cf/llava-hf/llava-1.5-7b-hf",
        params
      );

      // Extract the description from the response
      const { description } = response;

      return this.createSuccessResult({
        description,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
