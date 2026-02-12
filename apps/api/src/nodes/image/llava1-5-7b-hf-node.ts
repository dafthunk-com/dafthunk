import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: LLaVA 1.5 7B vision-language model
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.08,
  outputCostPerMillion: 0.15,
};

/**
 * Image-to-Text node implementation using LLaVA 1.5 7B HF
 */
export class LLaVA157BHFNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llava1-5-7b-hf",
    name: "Image Generation (LLaVA)",
    type: "llava1-5-7b-hf",
    description:
      "Generates text descriptions from images using LLaVA 1.5 7B model",
    tags: ["AI", "Image", "Cloudflare", "Understanding"],
    icon: "image",
    documentation:
      "This node generates text descriptions from images using the LLaVA 1.5 7B model for image-to-text analysis.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/llava-1.5-7b-hf/",
    usage: 1,
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { image, prompt, max_tokens, temperature, top_p, top_k } =
        context.inputs;

      // Prepare the image data - convert to array of numbers
      const imageData = Array.from(new Uint8Array(image.data));

      // Prepare parameters for the model
      const params: AiImageToTextInput = {
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
        params,
        context.env.AI_OPTIONS
      );

      // Calculate usage based on image size and output text
      // Estimate input as image bytes / 100 + prompt tokens
      const imageTokenEstimate = Math.ceil(image.data.length / 100);
      const usage = calculateTokenUsage(
        imageTokenEstimate + (prompt || "").length / 4,
        response.description || "",
        PRICING
      );

      return this.createSuccessResult(
        { description: response.description },
        usage
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
