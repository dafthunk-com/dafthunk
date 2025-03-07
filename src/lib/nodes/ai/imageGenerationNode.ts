import { NodeContext, ExecutionResult } from "@/lib/workflowTypes";
import { BaseExecutableNode } from "../baseNode";

export class ImageGenerationNode extends BaseExecutableNode {
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
