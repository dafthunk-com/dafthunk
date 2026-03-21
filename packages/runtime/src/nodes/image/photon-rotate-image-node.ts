import { rotate } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node rotates an input image by a specified angle using the Photon library.
 */
export class PhotonRotateImageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-rotate-image",
    name: "Rotate Image",
    type: "photon-rotate-image",
    description:
      "Rotates an image by a specified angle (in degrees) using Photon.",
    tags: ["Image", "Photon", "Transform", "Rotate"],
    icon: "rotate-cw",
    documentation:
      "This node rotates an image by a specified angle (in degrees) using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to rotate.",
        required: true,
      },
      {
        name: "angle",
        type: "number",
        description: "Rotation angle in degrees (e.g., 90, -45, 180).",
        required: true,
        value: 0, // Default to no rotation
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The rotated image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, angle } = context.inputs as {
      image?: ImageParameter;
      angle?: number;
    };
    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof angle !== "number") {
      return this.createErrorResult("Rotation angle must be a number.");
    }
    return executePhotonOperation(this, image, (img) => {
      const result = rotate(img, angle);
      const bytes = result.get_bytes();
      result.free();
      return bytes;
    });
  }
}
