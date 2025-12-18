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

const STYLE_OPTIONS = [
  "vector_illustration",
  "vector_illustration/bold_stroke",
  "vector_illustration/chemistry",
  "vector_illustration/colored_stencil",
  "vector_illustration/contour_pop_art",
  "vector_illustration/cosmics",
  "vector_illustration/cutout",
  "vector_illustration/depressive",
  "vector_illustration/editorial",
  "vector_illustration/emotional_flat",
  "vector_illustration/infographical",
  "vector_illustration/marker_outline",
  "vector_illustration/mosaic",
  "vector_illustration/naivector",
  "vector_illustration/roundish_flat",
  "vector_illustration/segmented_colors",
  "vector_illustration/sharp_contrast",
  "vector_illustration/thin",
  "vector_illustration/vector_photo",
  "vector_illustration/vivid_shapes",
  "icon",
  "icon/broken_line",
  "icon/colored_outline",
  "icon/colored_shapes",
  "icon/colored_shapes_gradient",
  "icon/doodle_fill",
  "icon/doodle_offset_fill",
  "icon/offset_fill",
  "icon/outline",
  "icon/outline_gradient",
  "icon/uneven_fill",
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
 * Recraft 20B SVG node for generating SVG images from text prompts using Replicate API.
 * Optimized for vector illustrations and icons.
 * @see https://replicate.com/recraft-ai/recraft-20b-svg
 */
export class Recraft20bSvgNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    style: z.enum(STYLE_OPTIONS).optional().default("vector_illustration"),
    size: z.enum(SIZE_OPTIONS).optional().default("1024x1024"),
    aspect_ratio: z.enum(ASPECT_RATIO_OPTIONS).optional().default(""),
  });

  public static readonly nodeType: NodeType = {
    id: "recraft-20b-svg",
    name: "Text to SVG (Recraft 20B)",
    type: "recraft-20b-svg",
    description:
      "Generates SVG vector graphics and icons from text prompts using Recraft 20B AI",
    tags: [
      "AI",
      "Image",
      "Replicate",
      "SVG",
      "Vector",
      "Generate",
      "Text-to-Image",
      "Icon",
    ],
    icon: "pen-tool",
    documentation:
      "This node generates scalable vector graphics (SVG) from text prompts using the Recraft 20B SVG model via Replicate. Optimized for vector illustrations and icons with multiple substyles.",
    referenceUrl: "https://replicate.com/recraft-ai/recraft-20b-svg",
    inlinable: false,
    usage: 44,
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
          "Style: vector_illustration, icon, or substyles like vector_illustration/bold_stroke, icon/outline",
        value: "vector_illustration",
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
        name: "svg",
        type: "blob",
        description: "Generated SVG vector graphic",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = Recraft20bSvgNode.inputSchema.parse(
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

      console.log("Recraft20bSvgNode: Creating prediction");

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
              "666dcf90f18786723e083609cee6c84a0f162cc73d7066fd2d3ad3cb6ba88b1c",
            input,
          }),
        }
      );

      console.log(
        "Recraft20bSvgNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "Recraft20bSvgNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "Recraft20bSvgNode: Initial prediction:",
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
        console.log("Recraft20bSvgNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "Recraft20bSvgNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("Recraft20bSvgNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "Recraft20bSvgNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Recraft 20B SVG generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult(
          "Recraft 20B SVG generation was canceled"
        );
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Recraft 20B SVG generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Recraft 20B SVG generation succeeded but no output was returned"
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
