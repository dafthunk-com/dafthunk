import { NodeExecution, NodeType } from "@dafthunk/types";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { ObjectStore } from "../../stores/object-store";
import { ExecutableNode, ImageParameter, NodeContext } from "../types";

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
export class Trellis2Node extends ExecutableNode {
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
    shape_sampling_steps: z.number().int().min(1).max(100).optional().default(12),
    shape_guidance_scale: z.number().min(0).max(20).optional().default(7.5),
    texture_sampling_steps: z.number().int().min(1).max(100).optional().default(12),
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
    usage: 100,
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
        type: "blob",
        description: "Video preview of the 3D model",
      },
      {
        name: "no_background_image",
        type: "image",
        description: "Input image with background removed",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = Trellis2Node.inputSchema.parse(context.inputs);

      // Get Replicate API token from environment
      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      // Generate presigned URL for input image
      const imageUrl = await this.uploadImageAndGetPresignedUrl(
        validatedInput.image,
        context
      );

      console.log("Trellis2Node: Uploaded image:", imageUrl);

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 600000; // 10 minutes total
      const startTime = Date.now();

      console.log("Trellis2Node: Creating prediction");

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

      console.log(
        "Trellis2Node: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Trellis2Node: Create prediction failed:", errorText);
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "Trellis2Node: Initial prediction:",
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
        console.log("Trellis2Node: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log("Trellis2Node: Poll response status:", pollResponse.status);

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("Trellis2Node: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "Trellis2Node: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );

        // Add a minimum delay between polls to avoid hitting subrequest limits
        // The Prefer header should already throttle, but this is a safety net
        // For 6-7 min execution time, 10s delay = ~42 polls max (well under 1000 paid tier limit)
        if (
          prediction.status !== "succeeded" &&
          prediction.status !== "failed" &&
          prediction.status !== "canceled"
        ) {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second delay
        }
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Trellis 2 generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Trellis 2 generation was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Trellis 2 generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      const outputs: Record<string, { data: Uint8Array; mimeType: string }> =
        {};

      // Download the GLB model file if available
      if (prediction.output?.model_file) {
        const modelResponse = await fetch(prediction.output.model_file);
        if (!modelResponse.ok) {
          return this.createErrorResult(
            `Failed to download model file: ${modelResponse.status}`
          );
        }
        outputs.model = {
          data: new Uint8Array(await modelResponse.arrayBuffer()),
          mimeType: "model/gltf-binary",
        };
      }

      // Download video if available
      if (prediction.output?.video) {
        const videoResponse = await fetch(prediction.output.video);
        if (videoResponse.ok) {
          outputs.video = {
            data: new Uint8Array(await videoResponse.arrayBuffer()),
            mimeType: "video/mp4",
          };
        }
      }

      // Download no_background_image if available
      if (prediction.output?.no_background_image) {
        const imageResponse = await fetch(
          prediction.output.no_background_image
        );
        if (imageResponse.ok) {
          const contentType =
            imageResponse.headers.get("content-type") || "image/png";
          outputs.no_background_image = {
            data: new Uint8Array(await imageResponse.arrayBuffer()),
            mimeType: contentType,
          };
        }
      }

      if (Object.keys(outputs).length === 0) {
        return this.createErrorResult(
          "Trellis 2 generation succeeded but no outputs were returned"
        );
      }

      return this.createSuccessResult(outputs);
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

  /**
   * Upload image to R2 and generate a presigned URL for external access.
   * The URL expires after 1 hour (sufficient for Trellis processing).
   */
  private async uploadImageAndGetPresignedUrl(
    image: ImageParameter,
    context: NodeContext
  ): Promise<string> {
    const {
      CLOUDFLARE_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      RESSOURCES,
    } = context.env;

    // Validate required credentials
    if (
      !CLOUDFLARE_ACCOUNT_ID ||
      !R2_ACCESS_KEY_ID ||
      !R2_SECRET_ACCESS_KEY ||
      !R2_BUCKET_NAME
    ) {
      throw new Error(
        "R2 presigned URL credentials not configured. Required: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
      );
    }

    // Create object store and configure presigned URLs
    const objectStore = new ObjectStore(RESSOURCES);
    objectStore.configurePresignedUrls({
      accountId: CLOUDFLARE_ACCOUNT_ID,
      bucketName: R2_BUCKET_NAME,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    });

    // Generate a unique ID for the temporary image
    const imageId = uuid();
    const reference = { id: imageId, mimeType: image.mimeType };

    // Write the image to R2
    await objectStore.writeObjectWithId(
      imageId,
      image.data,
      image.mimeType,
      context.organizationId
    );

    // Generate presigned URL (1 hour expiry)
    const presignedUrl = await objectStore.getPresignedUrl(reference, 3600);

    return presignedUrl;
  }
}
