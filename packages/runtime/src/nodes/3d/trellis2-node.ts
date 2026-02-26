import { MultiStepNode, type MultiStepNodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: {
    model_file?: string;
    video?: string;
    no_background_image?: string;
  };
  error?: string;
}

/**
 * Trellis 2 node for generating 3D models from images using Replicate API.
 * Accepts a single image blob, uploads it to R2 with presigned URL for Replicate access.
 * @see https://replicate.com/fishwowater/trellis2
 */
export class Trellis2Node extends MultiStepNode {
  private static readonly inputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
    seed: z.number().int().optional().default(42),
    randomize_seed: z.boolean().optional().default(false),
    pipeline_type: z
      .enum(["512", "1024", "1024_cascade", "1536_cascade"])
      .optional()
      .default("1024_cascade"),
    texture_size: z.number().int().min(1024).max(8192).optional().default(4096),
    generate_model: z.boolean().optional().default(true),
    generate_video: z.boolean().optional().default(true),
    shape_sampling_steps: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(12),
    shape_guidance_scale: z.number().min(0).max(20).optional().default(7.5),
    texture_sampling_steps: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(12),
    texture_guidance_scale: z.number().min(0).max(20).optional().default(7.5),
  });

  public static readonly nodeType: NodeType = {
    id: "trellis2",
    name: "3D Generation (Trellis 2)",
    type: "trellis2",
    description:
      "Generates 3D models (GLB) from a single image using the Trellis 2 model on Replicate",
    tags: ["AI", "3D", "Replicate", "Trellis", "Generate"],
    icon: "box",
    documentation:
      "This node generates 3D models from a single input image using Microsoft's Trellis 2 model via Replicate. Outputs a GLB file and optional video preview.",
    referenceUrl: "https://replicate.com/fishwowater/trellis2",
    inlinable: false,
    usage: 1000,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "Input image to generate 3D model from",
        required: true,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for generation (default: 42)",
        value: 42,
        hidden: true,
      },
      {
        name: "randomize_seed",
        type: "boolean",
        description: "Randomize seed (default: false)",
        value: false,
        hidden: true,
      },
      {
        name: "pipeline_type",
        type: "string",
        description:
          "Quality/speed tradeoff: 512 (fast), 1024, 1024_cascade, 1536_cascade (best)",
        value: "1024_cascade",
        hidden: true,
      },
      {
        name: "texture_size",
        type: "number",
        description: "GLB texture size, 1024-8192 (default: 4096)",
        value: 4096,
        hidden: true,
      },
      {
        name: "generate_model",
        type: "boolean",
        description: "Generate 3D model file (default: true)",
        value: true,
        hidden: true,
      },
      {
        name: "generate_video",
        type: "boolean",
        description: "Generate video preview (default: true)",
        value: true,
        hidden: true,
      },
      {
        name: "shape_sampling_steps",
        type: "number",
        description: "Shape sampling steps, 1-100 (default: 12)",
        value: 12,
        hidden: true,
      },
      {
        name: "shape_guidance_scale",
        type: "number",
        description: "Shape guidance scale, 0-20 (default: 7.5)",
        value: 7.5,
        hidden: true,
      },
      {
        name: "texture_sampling_steps",
        type: "number",
        description: "Texture sampling steps, 1-100 (default: 12)",
        value: 12,
        hidden: true,
      },
      {
        name: "texture_guidance_scale",
        type: "number",
        description: "Texture guidance scale, 0-20 (default: 7.5)",
        value: 7.5,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "model",
        type: "gltf",
        description: "Generated 3D model in GLB format",
      },
      {
        name: "video",
        type: "video",
        description: "Video preview of the 3D model",
      },
      {
        name: "no_background_image",
        type: "image",
        description: "Input image with background removed",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = Trellis2Node.inputSchema.parse(context.inputs);

      // Get Replicate API token from environment
      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      if (!context.objectStore) {
        return this.createErrorResult("ObjectStore not available in context");
      }

      // Generate presigned URL for input image
      const imageUrl = await context.objectStore.writeAndPresign(
        validatedInput.image.data,
        validatedInput.image.mimeType,
        context.organizationId
      );

      // Create prediction (durable step — cached on replay)
      const prediction = await doStep(async () => {
        const response = await fetch(
          "https://api.replicate.com/v1/predictions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              version:
                "52e1ad6852599ea10ce8e257635a3c11485cba51c181ea5173e34d9b2955b226",
              input: {
                image: imageUrl,
                seed: validatedInput.seed,
                randomize_seed: validatedInput.randomize_seed,
                pipeline_type: validatedInput.pipeline_type,
                texture_size: validatedInput.texture_size,
                generate_model: validatedInput.generate_model,
                generate_video: validatedInput.generate_video,
                shape_sampling_steps: validatedInput.shape_sampling_steps,
                shape_guidance_scale: validatedInput.shape_guidance_scale,
                texture_sampling_steps: validatedInput.texture_sampling_steps,
                texture_guidance_scale: validatedInput.texture_guidance_scale,
              },
            }),
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
        await sleep(10_000);

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
          `Trellis 2 generation failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult("Trellis 2 generation was canceled");
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "Trellis 2 generation timed out after 10 minutes"
        );
      }

      // Download outputs (outside doStep — binary data is too large
      // for SQLite persistence; re-downloading on replay is fine)
      const downloads: Record<string, { data: Uint8Array; mimeType: string }> =
        {};

      if (result.output?.model_file) {
        const modelResponse = await fetch(result.output.model_file);
        if (!modelResponse.ok) {
          throw new Error(
            `Failed to download model file: ${modelResponse.status}`
          );
        }
        downloads.model = {
          data: new Uint8Array(await modelResponse.arrayBuffer()),
          mimeType: "model/gltf-binary",
        };
      }

      if (result.output?.video) {
        const videoResponse = await fetch(result.output.video);
        if (videoResponse.ok) {
          downloads.video = {
            data: new Uint8Array(await videoResponse.arrayBuffer()),
            mimeType: "video/mp4",
          };
        }
      }

      if (result.output?.no_background_image) {
        const imageResponse = await fetch(result.output.no_background_image);
        if (imageResponse.ok) {
          const contentType =
            imageResponse.headers.get("content-type") || "image/png";
          downloads.no_background_image = {
            data: new Uint8Array(await imageResponse.arrayBuffer()),
            mimeType: contentType,
          };
        }
      }

      if (Object.keys(downloads).length === 0) {
        return this.createErrorResult(
          "Trellis 2 generation succeeded but no outputs were returned"
        );
      }

      return this.createSuccessResult(downloads);
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
