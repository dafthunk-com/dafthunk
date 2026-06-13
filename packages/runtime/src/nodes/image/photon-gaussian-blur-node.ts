import { gaussian_blur } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node applies Gaussian blur to an input image using the Photon library.
 */
export class PhotonGaussianBlurNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    radius: z
      .number({ error: "Blur radius must be a non-negative number." })
      .min(0, { error: "Blur radius must be a non-negative number." }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-gaussian-blur",
    name: "Gaussian Blur",
    type: "photon-gaussian-blur",
    description:
      "Applies Gaussian blur to an image. Higher radius means more blur.",
    tags: ["Image", "Photon", "Effect", "Blur"],
    icon: "scan-eye",
    documentation:
      "This node applies Gaussian blur to an image. Higher radius means more blur.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to blur.",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description:
          "Blur radius (integer, e.g., 1, 2, 3). Higher values increase blur intensity.",
        required: true,
        value: 1, // Default to a minimal blur
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The blurred image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonGaussianBlurNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, radius } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      gaussian_blur(img, Math.round(radius));
      return img.get_bytes();
    });
  }
}
