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

const STYLE_OPTIONS = ["any", "engraving", "line_art", "line_circuit", "linocut"] as const;

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
 * Recraft V3 SVG node for generating SVG images from text prompts using Replicate API.
 * @see https://replicate.com/recraft-ai/recraft-v3-svg
 */
export class RecraftV3SvgNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    style: z.enum(STYLE_OPTIONS).optional().default("any"),
    size: z.enum(SIZE_OPTIONS).optional().default("1024x1024"),
    aspect_ratio: z.enum(ASPECT_RATIO_OPTIONS).optional().default(""),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-v3-svg",
    name: "Text to SVG (Recraft V3)",
    type: "recraft-v3-svg",
    description:
      "Generates SVG vector graphics from text prompts using Recraft V3 AI",
    tags: ["AI", "Image", "Replicate", "SVG", "Vector", "Generate", "Text-to-Image"],
    icon: "pen-tool",
    documentation:
      "This node generates scalable vector graphics (SVG) from text prompts using the Recraft V3 SVG model via Replicate. Supports multiple styles including engraving, line art, and linocut.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-v3-svg",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text prompt describing the SVG to generate",
        required: true,
      },
      {
        name: "style",
        type: "string",
        description:
          "Style of the generated image: any, engraving, line_art, line_circuit, linocut",
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
        description:
          "Aspect ratio (e.g., 1:1, 16:9). Overrides size if set.",
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
      const validatedInput = RecraftV3SvgNode.inputSchema.parse(context.inputs);

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

      console.log("RecraftV3SvgNode: Creating prediction");

      // Build input object, only including aspect_ratio if set
      const input: Record<string, string> = {
        prompt: validatedInput.prompt,
        style: validatedInput.style,
        size: validatedInput.size,
      };
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
              "df041379628fa1d16bd406409930775b0904dc2bc0f3e3f38ecd2a4389e9329d",
            input,
          }),
        }
      );

      console.log(
        "RecraftV3SvgNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("RecraftV3SvgNode: Create prediction failed:", errorText);
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "RecraftV3SvgNode: Initial prediction:",
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
        console.log("RecraftV3SvgNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "RecraftV3SvgNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("RecraftV3SvgNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "RecraftV3SvgNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft V3 SVG generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Recraft V3 SVG generation was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft V3 SVG generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft V3 SVG generation succeeded but no output was returned"
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
