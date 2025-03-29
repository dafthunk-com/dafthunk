import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ExecutableNode } from "../types";
import { NodeType } from "../types";
import { StringParameter, ImageParameter, NumberParameter } from "../types";

/**
 * Image-to-Text node implementation using UForm-Gen2
 */
export class UformGen2Qwen500mNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "uform-gen2-qwen-500m",
    name: "UForm Gen2 Qwen 500M",
    type: "uform-gen2-qwen-500m",
    description:
      "Generates text descriptions from images using UForm-Gen2 model (smaller and faster than LLaVA)",
    category: "Image",
    icon: "messageSquare",
    inputs: [
      {
        name: "image",
        type: ImageParameter,
        description: "The image to generate a description for",
        required: true,
      },
      {
        name: "prompt",
        type: StringParameter,
        description: "The input text prompt for guiding the model's response",
        value: new StringParameter("Generate a caption for this image"),
        hidden: true,
      },
      {
        name: "max_tokens",
        type: NumberParameter,
        description: "The maximum number of tokens to generate in the response",
        value: new NumberParameter(512),
        hidden: true,
      },
      {
        name: "top_p",
        type: NumberParameter,
        description:
          "Controls the diversity of outputs by limiting to the most probable tokens",
        value: new NumberParameter(0.95),
        hidden: true,
      },
      {
        name: "top_k",
        type: NumberParameter,
        description:
          "Limits the AI to choose from the top 'k' most probable words",
        value: new NumberParameter(40),
        hidden: true,
      },
      {
        name: "repetition_penalty",
        type: NumberParameter,
        description:
          "Penalty for repeated tokens; higher values discourage repetition",
        value: new NumberParameter(1.0),
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "description",
        type: StringParameter,
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

      // Convert image data to Uint8Array if it's not already
      const imageData =
        image.data instanceof Uint8Array
          ? image.data
          : new Uint8Array(image.data);

      // Prepare parameters for the model
      const params: any = {
        image: Array.from(imageData), // Convert to regular array as required by the API
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

      if (!response.description) {
        throw new Error("No description received from the API");
      }

      return this.createSuccessResult({
        description: new StringParameter(response.description),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
