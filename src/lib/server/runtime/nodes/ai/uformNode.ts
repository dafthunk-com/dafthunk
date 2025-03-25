import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Image-to-Text node implementation using UForm-Gen2
 */
export class UFormNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "uform-image-to-text",
    name: "UForm Image to Text",
    type: "uform-image-to-text",
    description:
      "Generates text descriptions from images using UForm-Gen2 model (smaller and faster than LLaVA)",
    category: "AI",
    icon: "messageSquare",
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to generate a description for",
      },
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for guiding the model's response",
        value: "Generate a caption for this image",
      },
      {
        name: "max_tokens",
        type: "number",
        description: "The maximum number of tokens to generate in the response",
        value: 512,
      },
      {
        name: "top_p",
        type: "number",
        description:
          "Controls the diversity of outputs by limiting to the most probable tokens",
        value: 0.95,
      },
      {
        name: "top_k",
        type: "number",
        description:
          "Limits the AI to choose from the top 'k' most probable words",
        value: 40,
      },
      {
        name: "repetition_penalty",
        type: "number",
        description:
          "Penalty for repeated tokens; higher values discourage repetition",
        value: 1.0,
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

      const { image, prompt, max_tokens, top_p, top_k, repetition_penalty } =
        context.inputs;

      // Validate inputs
      if (!image || !image.data) {
        throw new Error("Image input is required");
      }

      console.log(
        `Processing image for UForm, data length: ${image.data.length} bytes`
      );
      console.log(`Prompt: "${prompt || "Generate a caption for this image"}"`);

      // Prepare the image data - convert to array of numbers
      const imageData = Array.from(new Uint8Array(image.data));

      // Prepare parameters for the model
      const params: any = {
        image: imageData,
        prompt: prompt || "Generate a caption for this image",
        max_tokens: max_tokens || 512,
      };

      // Add optional parameters if provided
      if (top_p !== undefined) params.top_p = top_p;
      if (top_k !== undefined) params.top_k = top_k;
      if (repetition_penalty !== undefined)
        params.repetition_penalty = repetition_penalty;

      // Call Cloudflare AI UForm model
      const response = await context.env.AI.run(
        "@cf/unum/uform-gen2-qwen-500m",
        params
      );

      console.log("UForm response:", response);

      // Extract the description from the response
      const { description } = response;

      return this.createSuccessResult({
        description,
      });
    } catch (error) {
      console.error("UFormNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
