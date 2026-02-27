import type { ImageParameter, MultiStepNodeContext } from "@dafthunk/runtime";
import { MultiStepNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
}

const SIZE_OPTIONS = ["2K", "3K"] as const;
const ASPECT_RATIO_OPTIONS = [
  "match_input_image",
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "3:2",
  "2:3",
  "21:9",
] as const;
const OUTPUT_FORMAT_OPTIONS = ["png", "jpeg"] as const;
const SEQUENTIAL_OPTIONS = ["disabled", "auto"] as const;

const blobSchema = z
  .object({
    data: z.instanceof(Uint8Array),
    mimeType: z.string(),
  })
  .optional();

/**
 * Seedream 5 Lite node for generating images using ByteDance's model via Replicate.
 * @see https://replicate.com/bytedance/seedream-5-lite
 */
export class Seedream5LiteNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    image_input: blobSchema,
    size: z.enum(SIZE_OPTIONS).optional().default("2K"),
    aspect_ratio: z
      .enum(ASPECT_RATIO_OPTIONS)
      .optional()
      .default("match_input_image"),
    sequential_image_generation: z
      .enum(SEQUENTIAL_OPTIONS)
      .optional()
      .default("disabled"),
    max_images: z.number().int().min(1).max(15).optional().default(1),
    output_format: z.enum(OUTPUT_FORMAT_OPTIONS).optional().default("png"),
  });

  public static readonly nodeType: NodeType = {
    id: "seedream-5-lite",
    name: "Image Generation (Seedream 5 Lite)",
    type: "seedream-5-lite",
    description:
      "Generates high-quality images from text prompts or reference images using ByteDance's Seedream 5 Lite model via Replicate",
    tags: [
      "AI",
      "Image",
      "Replicate",
      "ByteDance",
      "Generate",
      "Text-to-Image",
      "Seedream",
    ],
    icon: "image",
    documentation:
      "Generates images using ByteDance's Seedream 5 Lite model via Replicate. Supports text-to-image and image-to-image generation with configurable resolution (2K/3K), aspect ratio, and output format. When sequential_image_generation is set to 'auto', the model may generate multiple related images (e.g., story scenes, character variations) up to max_images.",
    referenceUrl: "https://replicate.com/bytedance/seedream-5-lite",
    inlinable: false,
    usage: 100,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text prompt for image generation",
        required: true,
      },
      {
        name: "image_input",
        type: "image",
        description:
          "Optional input image for image-to-image generation (use 'match_input_image' aspect ratio to preserve dimensions)",
      },
      {
        name: "size",
        type: "string",
        description: "Image resolution: 2K (2048px) or 3K (3072px)",
        value: "2K",
        hidden: true,
      },
      {
        name: "aspect_ratio",
        type: "string",
        description:
          "Image aspect ratio. Use 'match_input_image' to automatically match the input image's aspect ratio.",
        value: "match_input_image",
        hidden: true,
      },
      {
        name: "sequential_image_generation",
        type: "string",
        description:
          "'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images.",
        value: "disabled",
        hidden: true,
      },
      {
        name: "max_images",
        type: "number",
        description:
          "Maximum number of images to generate when sequential_image_generation='auto'. Range: 1-15.",
        value: 1,
        hidden: true,
      },
      {
        name: "output_format",
        type: "string",
        description: "Output image format: png or jpeg",
        value: "png",
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

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = Seedream5LiteNode.inputSchema.parse(
        context.inputs
      );

      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      const input: Record<string, string | number | string[]> = {
        prompt: validatedInput.prompt,
        size: validatedInput.size,
        aspect_ratio: validatedInput.aspect_ratio,
        sequential_image_generation:
          validatedInput.sequential_image_generation,
        max_images: validatedInput.max_images,
        output_format: validatedInput.output_format,
      };

      // Upload image input to R2 and pass presigned URL to Replicate
      if (validatedInput.image_input) {
        if (!context.objectStore) {
          return this.createErrorResult(
            "ObjectStore not available in context (required for image input)"
          );
        }
        const imageBlob = validatedInput.image_input as ImageParameter;
        const imageUrl = await context.objectStore.writeAndPresign(
          imageBlob.data,
          imageBlob.mimeType,
          context.organizationId
        );
        input.image_input = [imageUrl];
      }

      // Create prediction (durable step — cached on replay)
      const prediction = await doStep(async () => {
        const response = await fetch(
          "https://api.replicate.com/v1/models/bytedance/seedream-5-lite/predictions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ input }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to create Replicate prediction: ${response.status} ${errorText}`
          );
        }

        return (await response.json()) as ReplicatePrediction;
      });

      // Poll with durable sleep (zero compute cost between polls)
      const maxPolls = 60;
      let result = prediction;
      for (
        let i = 0;
        i < maxPolls &&
        result.status !== "succeeded" &&
        result.status !== "failed" &&
        result.status !== "canceled";
        i++
      ) {
        await sleep(5_000);

        result = await doStep(async () => {
          const response = await fetch(
            `https://api.replicate.com/v1/predictions/${prediction.id}`,
            {
              headers: {
                Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to poll prediction status: ${response.status} ${errorText}`
            );
          }

          return (await response.json()) as ReplicatePrediction;
        });
      }

      if (result.status === "failed") {
        return this.createErrorResult(
          `Seedream 5 Lite generation failed: ${result.error ?? "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult(
          "Seedream 5 Lite generation was canceled"
        );
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "Seedream 5 Lite generation timed out after 5 minutes"
        );
      }

      if (!result.output || result.output.length === 0) {
        return this.createErrorResult(
          "Seedream 5 Lite generation succeeded but no output was returned"
        );
      }

      // Download the first image from the output array
      // (outside doStep — binary data is too large for SQLite persistence;
      // re-downloading on replay is fine)
      const imageResponse = await fetch(result.output[0]);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download generated image: ${imageResponse.status}`
        );
      }

      const imageData = new Uint8Array(await imageResponse.arrayBuffer());
      const contentType =
        imageResponse.headers.get("content-type") ??
        `image/${validatedInput.output_format}`;

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
