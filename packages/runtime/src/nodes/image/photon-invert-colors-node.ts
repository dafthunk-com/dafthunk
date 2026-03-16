import { invert } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node inverts the colors of an input image using the Photon library.
 */
export class PhotonInvertColorsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-invert-colors",
    name: "Invert Colors",
    type: "photon-invert-colors",
    description: "Inverts the colors of an image using Photon.",
    tags: ["Image", "Photon", "Effect", "Invert"],
    icon: "aperture",
    documentation: "This node inverts the colors of an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to invert.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The color-inverted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image } = context.inputs as { image?: ImageParameter };
    return executePhotonOperation(this, image, (img) => {
      invert(img);
      return img.get_bytes();
    });
  }
}
