import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string;
  error?: string;
}

const STYLE_OPTIONS = [
  "any",
  "realistic_image",
  "digital_illustration",
  "digital_illustration/pixel_art",
  "digital_illustration/hand_drawn",
  "digital_illustration/grain",
  "digital_illustration/infantile_sketch",
  "digital_illustration/2d_art_poster",
  "digital_illustration/handmade_3d",
  "digital_illustration/hand_drawn_outline",
  "digital_illustration/engraving_color",
  "digital_illustration/2d_art_poster_2",
  "realistic_image/b_and_w",
  "realistic_image/hard_flash",
  "realistic_image/hdr",
  "realistic_image/natural_light",
  "realistic_image/studio_portrait",
  "realistic_image/enterprise",
  "realistic_image/motion_blur",
] as const;

const SIZE_OPTIONS = [
  "1024x1024",
  "1365x1024",
  "1024x1365",
  "1536x1024",
  "1024x1536",
  "1820x1024",
  "1024x1820",
  "1024x2048",
  "2048x1024",
  "1434x1024",
  "1024x1434",
  "1024x1280",
  "1280x1024",
  "1024x1707",
  "1707x1024",
] as const;

const ASPECT_RATIO_OPTIONS = [
  "",
  "1:1",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "16:9",
  "9:16",
  "1:2",
  "2:1",
  "7:5",
  "5:7",
  "4:5",
  "5:4",
  "3:5",
  "5:3",
] as const;

/**
 * Recraft V3 node for generating images from text prompts using Replicate API.
 * @see https://replicate.com/recraft-ai/recraft-v3
 */
export class RecraftV3Node extends ExecutableNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    style: z.enum(STYLE_OPTIONS).optional().default("any"),
    size: z.enum(SIZE_OPTIONS).optional().default("1024x1024"),
    aspect_ratio: z.enum(ASPECT_RATIO_OPTIONS).optional().default(""),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-v3",
    name: "Image Generation (Recraft V3)",
    type: "recraft-v3",
    description:
      "Generates images from text prompts using Recraft V3 AI with multiple style options",
    tags: ["AI", "Image", "Replicate", "Generate", "Text-to-Image", "Recraft"],
    icon: "image",
    documentation:
      "This node generates images from text prompts using the Recraft V3 model via Replicate. Supports realistic images and digital illustrations with multiple style options.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-v3",
    inlinable: false,
    usage: 40,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text prompt describing the image to generate",
        required: true,
      },
      {
        name: "style",
        type: "string",
        description:
          "Style of the generated image (e.g., any, realistic_image, digital_illustration/pixel_art)",
        value: "any",
      },
      {
        name: "size",
        type: "string",
        description:
          "Image dimensions (e.g., 1024x1024). Ignored if aspect_ratio is set.",
        value: "1024x1024",
        hidden: true,
      },
      {
        name: "aspect_ratio",
        type: "string",
        description: "Aspect ratio (e.g., 1:1, 16:9). Overrides size if set.",
        value: "",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Generated image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = RecraftV3Node.inputSchema.parse(context.inputs);

      // Get Replicate API token from environment
      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 300000; // 5 minutes total
      const startTime = Date.now();

      console.log("RecraftV3Node: Creating prediction");

      // Build input object
      const input: Record<string, string> = {
        prompt: validatedInput.prompt,
        size: validatedInput.size,
      };

      if (validatedInput.style !== "any") {
        input.style = validatedInput.style;
      }

      if (validatedInput.aspect_ratio) {
        input.aspect_ratio = validatedInput.aspect_ratio;
      }

      const createResponse = await fetch(
        "https://api.replicate.com/v1/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
          body: JSON.stringify({
            version:
              "9507e61ddace8b3a238371b17a61be203747c5081ea6070fecd3c40d27318922",
            input,
          }),
        }
      );

      console.log(
        "RecraftV3Node: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("RecraftV3Node: Create prediction failed:", errorText);
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftV3Node: Initial prediction:",
        JSON.stringify({
          id: prediction.id,
          status: prediction.status,
        })
      );

      // Poll until completion or timeout
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed" &&
        prediction.status !== "canceled" &&
        Date.now() - startTime < maxWaitTime
      ) {
        if (context.onProgress) {
          const elapsed = Date.now() - startTime;
          context.onProgress(Math.min(0.9, elapsed / maxWaitTime));
        }

        // Poll Replicate API for prediction status
        const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
        console.log("RecraftV3Node: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftV3Node: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftV3Node: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftV3Node: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft V3 generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Recraft V3 generation was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft V3 generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft V3 generation succeeded but no output was returned"
        );
      }

      // Download the image file
      const imageResponse = await fetch(prediction.output);
      if (!imageResponse.ok) {
        return this.createErrorResult(
          `Failed to download image file: ${imageResponse.status}`
        );
      }
      const imageData = new Uint8Array(await imageResponse.arrayBuffer());

      // Determine mime type from response or default to webp
      const contentType =
        imageResponse.headers.get("content-type") || "image/webp";

      return this.createSuccessResult({
        image: {
          data: imageData,
          mimeType: contentType,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        return this.createErrorResult(`Validation error: ${errorMessages}`);
      }

      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

}
