import { pixelize } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node pixelizes an input image using the Photon library.
 */
export class PhotonPixelizeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-pixelize",
    name: "Pixelize Effect",
    type: "photon-pixelize",
    description: "Applies a pixelization effect to an image using Photon.",
    tags: ["Image", "Photon", "Effect", "Pixelize"],
    icon: "grid-3x3",
    documentation:
      "This node applies a pixelization effect to an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to pixelize.",
        required: true,
      },
      {
        name: "pixelSize",
        type: "number",
        description:
          "Targeted pixel size for the generated blocks (positive integer, e.g., 5, 10, 20).",
        required: true,
        value: 10,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The pixelized image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, pixelSize } = context.inputs as {
      image?: ImageParameter;
      pixelSize?: number;
    };
    if (
      typeof pixelSize !== "number" ||
      !Number.isInteger(pixelSize) ||
      pixelSize <= 0
    ) {
      return this.createErrorResult("Pixel size must be a positive integer.");
    }
    return executePhotonOperation(this, image, (img) => {
      pixelize(img, pixelSize);
      return img.get_bytes();
    });
  }
}
