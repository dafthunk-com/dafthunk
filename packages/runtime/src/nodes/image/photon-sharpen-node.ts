import { sharpen } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node sharpens an input image using the Photon library.
 */
export class PhotonSharpenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-sharpen",
    name: "Sharpen",
    type: "photon-sharpen",
    description: "Sharpens an image using Photon.",
    tags: ["Image", "Photon", "Effect", "Sharpen"],
    icon: "trending-up",
    documentation: "This node sharpens an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to sharpen.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The sharpened image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image } = context.inputs as { image?: ImageParameter };
    return executePhotonOperation(this, image, (img) => {
      sharpen(img);
      return img.get_bytes();
    });
  }
}
