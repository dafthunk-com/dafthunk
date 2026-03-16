import { gaussian_blur } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node applies Gaussian blur to an input image using the Photon library.
 */
export class PhotonGaussianBlurNode extends ExecutableNode {
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
    const { image, radius } = context.inputs as {
      image?: ImageParameter;
      radius?: number;
    };
    if (typeof radius !== "number" || radius < 0) {
      return this.createErrorResult(
        "Blur radius must be a non-negative number."
      );
    }
    return executePhotonOperation(this, image, (img) => {
      gaussian_blur(img, Math.round(radius));
      return img.get_bytes();
    });
  }
}
