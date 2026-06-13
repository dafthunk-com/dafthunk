import { blend } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonDualImageOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node blends two images together using a specified blend mode via the Photon library.
 */
export class PhotonBlendImagesNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    baseImage: imageInputSchema("Base image is missing or invalid."),
    blendImage: imageInputSchema("Blend image is missing or invalid."),
    blendMode: z
      .string({ error: "Blend mode must be a non-empty string." })
      .refine((value) => value.trim() !== "", {
        error: "Blend mode must be a non-empty string.",
      }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-blend-images",
    name: "Blend Images",
    type: "photon-blend-images",
    description:
      "Blends two images using a specified blend mode (e.g., 'overlay', 'multiply', 'screen', 'lighten', 'darken').",
    tags: ["Image", "Photon", "Blend"],
    icon: "layers",
    documentation:
      "This node blends two images using a specified blend mode (e.g., 'overlay', 'multiply', 'screen', 'lighten', 'darken').",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "baseImage",
        type: "image",
        description: "The base image.",
        required: true,
      },
      {
        name: "blendImage",
        type: "image",
        description: "The image to blend onto the base image.",
        required: true,
      },
      {
        name: "blendMode",
        type: "string",
        description:
          "The blend mode to use (e.g., 'overlay', 'multiply', 'screen'). Photon supports various modes like: 'overlay', 'over', 'atop', 'xor', 'plus', 'multiply', 'burn', 'darken', 'lighten', 'screen', 'dodge', 'exclusion', 'soft_light', 'hard_light'.",
        required: true,
        value: "overlay",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The blended image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonBlendImagesNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { baseImage, blendImage, blendMode } = parsed.data;
    return executePhotonDualImageOperation(
      this,
      baseImage,
      blendImage,
      "Base image",
      "Blend image",
      (a, b) => {
        blend(a, b, blendMode);
        return a.get_bytes();
      }
    );
  }
}
