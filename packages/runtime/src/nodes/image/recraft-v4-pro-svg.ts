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

const SIZE_OPTIONS = [
  "2048x2048",
  "3072x1536",
  "1536x3072",
  "2560x1664",
  "1664x2560",
  "2432x1792",
  "1792x2432",
  "2304x1792",
  "1792x2304",
  "1664x2688",
  "2560x1792",
  "1792x2560",
  "2688x1536",
  "1536x2688",
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
  "4:5",
  "5:4",
  "6:10",
  "14:10",
  "10:14",
] as const;

/**
 * Recraft V4 Pro SVG node for generating high-resolution SVG images from text prompts using Replicate API.
 * @see https://replicate.com/recraft-ai/recraft-v4-pro-svg
 */
export class RecraftV4ProSvgNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    size: z.enum(SIZE_OPTIONS).optional().default("2048x2048"),
    aspect_ratio: z.enum(ASPECT_RATIO_OPTIONS).optional().default(""),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-v4-pro-svg",
    name: "Text to SVG (Recraft V4 Pro)",
    type: "recraft-v4-pro-svg",
    description:
      "Generates high-resolution SVG vector graphics from text prompts using Recraft V4 Pro AI",
    tags: [
      "AI",
      "Image",
      "Replicate",
      "SVG",
      "Vector",
      "Generate",
      "Text-to-Image",
    ],
    icon: "pen-tool",
    documentation:
      "This node generates high-resolution scalable vector graphics (SVG) from text prompts using the Recraft V4 Pro SVG model via Replicate. Produces clean, editable vector files with detailed paths and structured layers.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-v4-pro-svg",
    inlinable: false,
    usage: 300,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text prompt describing the SVG to generate",
        required: true,
      },
      {
        name: "size",
        type: "string",
        description:
          "Image dimensions (e.g., 1024x1024). Ignored if aspect_ratio is set.",
        value: "2048x2048",
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
        name: "svg",
        type: "blob",
        description: "Generated SVG vector graphic",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = RecraftV4ProSvgNode.inputSchema.parse(
        context.inputs
      );

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

      console.log("RecraftV4ProSvgNode: Creating prediction");

      // Build input object, only including aspect_ratio if set
      const input: Record<string, string> = {
        prompt: validatedInput.prompt,
        size: validatedInput.size,
      };
      if (validatedInput.aspect_ratio) {
        input.aspect_ratio = validatedInput.aspect_ratio;
      }

      const createResponse = await fetch(
        "https://api.replicate.com/v1/models/recraft-ai/recraft-v4-pro-svg/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
          body: JSON.stringify({
            input,
          }),
        }
      );

      console.log(
        "RecraftV4ProSvgNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "RecraftV4ProSvgNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftV4ProSvgNode: Initial prediction:",
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
        console.log("RecraftV4ProSvgNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftV4ProSvgNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftV4ProSvgNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftV4ProSvgNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft V4 Pro SVG generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult(
          "Recraft V4 Pro SVG generation was canceled"
        );
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft V4 Pro SVG generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft V4 Pro SVG generation succeeded but no output was returned"
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
