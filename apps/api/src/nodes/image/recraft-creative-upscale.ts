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

/**
 * Recraft Creative Upscale node for enhancing image resolution and details using Replicate API.
 * Accepts image blobs, uploads them to R2 with presigned URLs for Replicate access.
 * @see https://replicate.com/recraft-ai/recraft-creative-upscale
 */
export class RecraftCreativeUpscaleNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-creative-upscale",
    name: "Creative Upscale (Recraft)",
    type: "recraft-creative-upscale",
    description:
      "Upscales images with AI-enhanced details, textures, and facial features using Recraft",
    tags: ["AI", "Image", "Replicate", "Upscale", "Enhance", "Recraft"],
    icon: "maximize",
    documentation:
      "This node upscales images using the Recraft Creative Upscale model via Replicate. It enhances details, refines complex elements, and improves textures and facial features.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-creative-upscale",
    inlinable: false,
    usage: 300,
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
        description: "Upscaled image with enhanced details",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = RecraftCreativeUpscaleNode.inputSchema.parse(
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

      console.log("RecraftCreativeUpscaleNode: Uploaded image");

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 600000; // 10 minutes total (upscaling can take longer)
      const startTime = Date.now();

      console.log("RecraftCreativeUpscaleNode: Creating prediction");

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
              "820d2aca1747b19c2f9f685c80524570722aa8ab671bac225eb12b93f124b110",
            input: {
              image: imageUrl,
            },
          }),
        }
      );

      console.log(
        "RecraftCreativeUpscaleNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "RecraftCreativeUpscaleNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftCreativeUpscaleNode: Initial prediction:",
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
        console.log("RecraftCreativeUpscaleNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftCreativeUpscaleNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftCreativeUpscaleNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftCreativeUpscaleNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft creative upscale failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Recraft creative upscale was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft creative upscale timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft creative upscale succeeded but no output was returned"
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
