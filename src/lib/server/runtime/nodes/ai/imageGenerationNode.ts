import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Image Generation node implementation using Stable Diffusion
 */
export class ImageGenerationNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "image-generation",
    name: "Image Generation",
    type: "image-generation",
    description:
      "Generates images from text descriptions using Stable Diffusion XL Lightning",
    category: "AI",
    icon: "wand",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "A text description of the image you want to generate",
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Text describing elements to avoid in the generated image",
      },
      {
        name: "height",
        type: "number",
        description: "The height of the generated image in pixels (256-2048)",
        value: 1024,
      },
      {
        name: "width",
        type: "number",
        description: "The width of the generated image in pixels (256-2048)",
        value: 1024,
      },
      {
        name: "num_steps",
        type: "number",
        description: "The number of diffusion steps (1-20)",
        value: 20,
      },
      {
        name: "guidance",
        type: "number",
        description:
          "Controls how closely the generated image should adhere to the prompt",
        value: 7.5,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "binary",
        description: "The generated image in PNG format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { prompt, negative_prompt, height, width, num_steps, guidance } =
        context.inputs;

      // Validate inputs
      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Ensure numeric parameters are within valid ranges
      const validatedHeight = Math.min(Math.max(height || 1024, 256), 2048);
      const validatedWidth = Math.min(Math.max(width || 1024, 256), 2048);
      const validatedSteps = Math.min(Math.max(num_steps || 20, 1), 20);
      const validatedGuidance = guidance || 7.5;

      // Call Cloudflare AI SDXL-Lightning model
      const stream = (await context.env.AI.run(
        "@cf/bytedance/stable-diffusion-xl-lightning",
        {
          prompt,
          negative_prompt: negative_prompt || "",
          height: validatedHeight,
          width: validatedWidth,
          num_steps: validatedSteps,
          guidance: validatedGuidance,
        }
      )) as ReadableStream;

      if (!stream) {
        throw new Error("Failed to generate image");
      }

      // Convert the stream to a Uint8Array
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
        }
      }

      // Concatenate all chunks into a single Uint8Array
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      // Ensure we have valid image data
      if (totalLength === 0) {
        throw new Error("No image data received from AI model");
      }

      // Convert Uint8Array to regular array for proper serialization
      // This ensures the binary data is properly transmitted to the client
      const serializedImageData = Array.from(result);

      return this.createSuccessResult({
        image: {
          data: serializedImageData,
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
