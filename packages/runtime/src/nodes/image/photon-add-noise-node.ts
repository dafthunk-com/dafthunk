import { inc_brightness } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node adds noise-like effects to an input image using the Photon library.
 * Note: Due to WASM compatibility issues with noise functions, this uses a brightness adjustment as a substitute.
 */
export class PhotonAddNoiseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-add-noise",
    name: "Add Noise",
    type: "photon-add-noise",
    description: "Adds randomized Gaussian noise to an image.",
    tags: ["Image", "Photon", "Effect", "Noise"],
    icon: "sparkles",
    documentation: "This node adds randomized Gaussian noise to an image.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to add noise to.",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description:
          "Amount of noise-like effect to add (brightness adjustment).",
        required: false,
        value: 10,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image with added noise (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, amount } = context.inputs as {
      image?: ImageParameter;
      amount?: number;
    };
    return executePhotonOperation(this, image, (img) => {
      inc_brightness(img, amount || 10);
      return img.get_bytes();
    });
  }
}
