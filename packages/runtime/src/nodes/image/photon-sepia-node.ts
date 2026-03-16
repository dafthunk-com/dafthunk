import { sepia } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node applies a sepia tone to an input image using the Photon library.
 */
export class PhotonSepiaNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-sepia",
    name: "Sepia Tone",
    type: "photon-sepia",
    description: "Applies a sepia tone to an image using Photon.",
    tags: ["Image", "Photon", "Effect", "Sepia"],
    icon: "coffee",
    documentation: "This node applies a sepia tone to an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply sepia tone to.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The sepia-toned image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image } = context.inputs as { image?: ImageParameter };
    return executePhotonOperation(this, image, (img) => {
      sepia(img);
      return img.get_bytes();
    });
  }
}
