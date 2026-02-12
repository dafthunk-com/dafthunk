import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string;
  error?: string;
}

/**
 * Recraft Crisp Upscale node for fast, faithful image upscaling using Replicate API.
 * Accepts image blobs, uploads them to R2 with presigned URLs for Replicate access.
 * @see https://replicate.com/recraft-ai/recraft-crisp-upscale
 */
export class RecraftCrispUpscaleNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-crisp-upscale",
    name: "Crisp Upscale (Recraft)",
    type: "recraft-crisp-upscale",
    description:
      "Fast, faithful image upscaling that preserves original details using Recraft",
    tags: ["AI", "Image", "Replicate", "Upscale", "Recraft"],
    icon: "maximize",
    documentation:
      "This node upscales images using the Recraft Crisp Upscale model via Replicate. It provides fast, faithful upscaling that preserves the original image details without creative enhancements.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-crisp-upscale",
    inlinable: false,
    usage: 6,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "Image to upscale",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Upscaled image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = RecraftCrispUpscaleNode.inputSchema.parse(
        context.inputs
      );

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

      // Generate presigned URL for the input image
      const imageUrl = await context.objectStore.writeAndPresign(
        validatedInput.image.data,
        validatedInput.image.mimeType,
        context.organizationId
      );

      console.log("RecraftCrispUpscaleNode: Uploaded image");

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 300000; // 5 minutes total
      const startTime = Date.now();

      console.log("RecraftCrispUpscaleNode: Creating prediction");

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
              "31c70d9026bbd25ee2b751825e19101e0321b8814c33863c88fe5d0d63c00c82",
            input: {
              image: imageUrl,
            },
          }),
        }
      );

      console.log(
        "RecraftCrispUpscaleNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "RecraftCrispUpscaleNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftCrispUpscaleNode: Initial prediction:",
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
        console.log("RecraftCrispUpscaleNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftCrispUpscaleNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftCrispUpscaleNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftCrispUpscaleNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft crisp upscale failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Recraft crisp upscale was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft crisp upscale timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft crisp upscale succeeded but no output was returned"
        );
      }

      // Download the upscaled image
      const imageResponse = await fetch(prediction.output);
      if (!imageResponse.ok) {
        return this.createErrorResult(
          `Failed to download upscaled image: ${imageResponse.status}`
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
