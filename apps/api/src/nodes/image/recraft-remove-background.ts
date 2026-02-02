import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import type { NodeContext } from "../types";
import { ExecutableNode } from "../types";

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
 * Recraft Remove Background node for removing image backgrounds using Replicate API.
 * Accepts image blobs, uploads them to R2 with presigned URLs for Replicate access.
 * @see https://replicate.com/recraft-ai/recraft-remove-background
 */
export class RecraftRemoveBackgroundNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-remove-background",
    name: "Remove Background (Recraft)",
    type: "recraft-remove-background",
    description:
      "Removes image backgrounds with AI, outputting PNG with transparent alpha channel",
    tags: ["AI", "Image", "Replicate", "Background", "Remove", "Recraft"],
    icon: "eraser",
    documentation:
      "This node removes backgrounds from images using the Recraft Remove Background model via Replicate. Outputs PNG with full alpha channel for transparent backgrounds. Supports PNG, JPG, WEBP inputs (max 5MB, 256-4096px).",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-remove-background",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description:
          "Image to remove background from (PNG, JPG, WEBP. Max 5MB, 256-4096px)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Image with transparent background (PNG with alpha)",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = RecraftRemoveBackgroundNode.inputSchema.parse(
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
        return this.createErrorResult(
          "ObjectStore not available in context"
        );
      }

      // Generate presigned URL for the input image
      const imageUrl = await context.objectStore.writeAndPresign(
        validatedInput.image.data,
        validatedInput.image.mimeType,
        context.organizationId
      );

      console.log("RecraftRemoveBackgroundNode: Uploaded image");

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 300000; // 5 minutes total
      const startTime = Date.now();

      console.log("RecraftRemoveBackgroundNode: Creating prediction");

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
              "bf4f3a4bf48c1a032e14f7cb8886992b52197ad3c71e5642a61f94151f80b521",
            input: {
              image: imageUrl,
            },
          }),
        }
      );

      console.log(
        "RecraftRemoveBackgroundNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "RecraftRemoveBackgroundNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftRemoveBackgroundNode: Initial prediction:",
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
        console.log("RecraftRemoveBackgroundNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftRemoveBackgroundNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftRemoveBackgroundNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftRemoveBackgroundNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft remove background failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Recraft remove background was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft remove background timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft remove background succeeded but no output was returned"
        );
      }

      // Download the output image
      const imageResponse = await fetch(prediction.output);
      if (!imageResponse.ok) {
        return this.createErrorResult(
          `Failed to download output image: ${imageResponse.status}`
        );
      }
      const imageData = new Uint8Array(await imageResponse.arrayBuffer());

      // Output is always PNG with alpha channel
      return this.createSuccessResult({
        image: {
          data: imageData,
          mimeType: "image/png",
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
