import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import type { NodeContext } from "../../runtime/node-types";
import { ExecutableNode } from "../../runtime/node-types";

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
 * Recraft Vectorize node for converting raster images to SVG using Replicate API.
 * Accepts image blobs, uploads them to R2 with presigned URLs for Replicate access.
 * @see https://replicate.com/recraft-ai/recraft-vectorize
 */
export class RecraftVectorizeNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-vectorize",
    name: "Image to SVG (Recraft)",
    type: "recraft-vectorize",
    description:
      "Converts raster images (PNG, JPG, WEBP) to SVG vector graphics using Recraft AI",
    tags: ["AI", "Image", "Replicate", "SVG", "Vector", "Convert"],
    icon: "file-type",
    documentation:
      "This node converts raster images to scalable vector graphics (SVG) using the Recraft Vectorize model via Replicate. Input images must be PNG, JPG, or WEBP format, max 5MB, with dimensions between 256-4096px.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-vectorize",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description:
          "Input raster image to convert (PNG, JPG, WEBP). Max 5MB, 256-4096px.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "svg",
        type: "blob",
        description: "Generated SVG vector graphic",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = RecraftVectorizeNode.inputSchema.parse(
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

      console.log("RecraftVectorizeNode: Uploaded image");

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 300000; // 5 minutes total
      const startTime = Date.now();

      console.log("RecraftVectorizeNode: Creating prediction");

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
              "0f3a420446213d60d7feb3c2bc83337114bb0a6be1f4959b374f5a4ad148d1af",
            input: {
              image: imageUrl,
            },
          }),
        }
      );

      console.log(
        "RecraftVectorizeNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "RecraftVectorizeNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftVectorizeNode: Initial prediction:",
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
        console.log("RecraftVectorizeNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftVectorizeNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftVectorizeNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftVectorizeNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft vectorization failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Recraft vectorization was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft vectorization timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft vectorization succeeded but no output was returned"
        );
      }

      // Download the SVG file
      const svgResponse = await fetch(prediction.output);
      if (!svgResponse.ok) {
        return this.createErrorResult(
          `Failed to download SVG file: ${svgResponse.status}`
        );
      }
      const svgData = new Uint8Array(await svgResponse.arrayBuffer());

      return this.createSuccessResult({
        svg: {
          data: svgData,
          mimeType: "image/svg+xml",
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
