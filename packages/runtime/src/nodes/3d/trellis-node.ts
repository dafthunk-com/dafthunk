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
    color_video?: string;
    normal_video?: string;
    combined_video?: string;
    gaussian_ply?: string;
    no_background_images?: string[];
  };
  error?: string;
}

/**
 * Trellis node for generating 3D models from images using Replicate API.
 * Accepts image blobs, uploads them to R2 with presigned URLs for Replicate access.
 * @see https://replicate.com/firtoz/trellis
 */
export class TrellisNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    images: z.array(
      z.object({
        data: z.instanceof(Uint8Array),
        mimeType: z.string(),
      })
    ),
    seed: z.number().int().optional().default(0),
    randomize_seed: z.boolean().optional().default(true),
    texture_size: z.number().int().min(512).max(2048).optional().default(1024),
    mesh_simplify: z.number().min(0.9).max(0.98).optional().default(0.95),
    ss_sampling_steps: z.number().int().min(1).max(50).optional().default(12),
    slat_sampling_steps: z.number().int().min(1).max(50).optional().default(12),
    ss_guidance_strength: z.number().min(0).max(20).optional().default(7.5),
    slat_guidance_strength: z.number().min(0).max(20).optional().default(3),
  });

  public static readonly nodeType: NodeType = {
    id: "trellis",
    name: "3D Generation (Trellis)",
    type: "trellis",
    description:
      "Generates 3D models (GLB) from images using the Trellis model on Replicate",
    tags: ["AI", "3D", "Replicate", "Trellis", "Generate"],
    icon: "box",
    documentation:
      "This node generates 3D models from input images using the Trellis model via Replicate. Outputs a GLB file that can be used in 3D workflows.",
    referenceUrl: "https://replicate.com/firtoz/trellis",
    inlinable: false,
    usage: 500,
    inputs: [
      {
        name: "images",
        type: "image",
        description:
          "Input images to generate 3D model from (1-4 images for multi-view)",
        required: true,
        repeated: true,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for generation (default: 0)",
        value: 0,
        hidden: true,
      },
      {
        name: "randomize_seed",
        type: "boolean",
        description: "Randomize seed (default: true)",
        value: true,
        hidden: true,
      },
      {
        name: "texture_size",
        type: "number",
        description: "GLB texture size, 512-2048 (default: 1024)",
        value: 1024,
        hidden: true,
      },
      {
        name: "mesh_simplify",
        type: "number",
        description: "Mesh simplification ratio, 0.9-0.98 (default: 0.95)",
        value: 0.95,
        hidden: true,
      },
      {
        name: "ss_sampling_steps",
        type: "number",
        description: "Sparse structure sampling steps, 1-50 (default: 12)",
        value: 12,
        hidden: true,
      },
      {
        name: "slat_sampling_steps",
        type: "number",
        description: "Structured latent sampling steps, 1-50 (default: 12)",
        value: 12,
        hidden: true,
      },
      {
        name: "ss_guidance_strength",
        type: "number",
        description: "Sparse structure guidance strength, 0-20 (default: 7.5)",
        value: 7.5,
        hidden: true,
      },
      {
        name: "slat_guidance_strength",
        type: "number",
        description: "Structured latent guidance strength, 0-20 (default: 3)",
        value: 3,
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
        description: "Color video preview of the 3D model",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = TrellisNode.inputSchema.parse(context.inputs);

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

      // Generate presigned URLs for all input images
      const imageUrls = await Promise.all(
        validatedInput.images.map((image) =>
          context.objectStore?.writeAndPresign(
            image.data,
            image.mimeType,
            context.organizationId
          )
        )
      );

      if (imageUrls.length === 0) {
        return this.createErrorResult("At least one image is required");
      }

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
                "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
              input: {
                images: imageUrls,
                seed: validatedInput.seed,
                randomize_seed: validatedInput.randomize_seed,
                generate_color: true,
                generate_normal: false,
                generate_model: true,
                save_gaussian_ply: false,
                texture_size: validatedInput.texture_size,
                mesh_simplify: validatedInput.mesh_simplify,
                ss_sampling_steps: validatedInput.ss_sampling_steps,
                slat_sampling_steps: validatedInput.slat_sampling_steps,
                ss_guidance_strength: validatedInput.ss_guidance_strength,
                slat_guidance_strength: validatedInput.slat_guidance_strength,
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
          `Trellis generation failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult("Trellis generation was canceled");
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "Trellis generation timed out after 10 minutes"
        );
      }

      const modelFileUrl = result.output?.model_file;
      if (!modelFileUrl) {
        return this.createErrorResult(
          "Trellis generation succeeded but no model file was returned"
        );
      }

      // Download outputs (outside doStep — binary data is too large
      // for SQLite persistence; re-downloading on replay is fine)
      const modelResponse = await fetch(modelFileUrl);
      if (!modelResponse.ok) {
        throw new Error(
          `Failed to download model file: ${modelResponse.status}`
        );
      }
      const modelData = new Uint8Array(await modelResponse.arrayBuffer());

      let videoData: Uint8Array | undefined;
      const videoUrl =
        result.output?.color_video || result.output?.combined_video;
      if (videoUrl) {
        const videoResponse = await fetch(videoUrl);
        if (videoResponse.ok) {
          videoData = new Uint8Array(await videoResponse.arrayBuffer());
        }
      }

      return this.createSuccessResult({
        model: {
          data: modelData,
          mimeType: "model/gltf-binary",
        },
        ...(videoData && {
          video: {
            data: videoData,
            mimeType: "video/mp4",
          },
        }),
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
