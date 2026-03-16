import { oil } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node applies an oil painting effect to an input image using the Photon library.
 */
export class PhotonOilPaintingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-oil-painting",
    name: "Oil Painting Effect",
    type: "photon-oil-painting",
    description: "Applies an oil painting effect to an image using Photon.",
    tags: ["Image", "Photon", "Effect", "OilPainting"],
    icon: "palette",
    documentation:
      "This node applies an oil painting effect to an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply the oil painting effect to.",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description:
          "Radius of each paint particle (integer, e.g., 2-10). Photon default: 4.",
        required: true,
        value: 4,
      },
      {
        name: "intensity",
        type: "number",
        description:
          "Intensity of the effect (float, e.g., 20.0-100.0). Photon default: 55.0.",
        required: true,
        value: 55.0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The oil painting-style image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, radius, intensity } = context.inputs as {
      image?: ImageParameter;
      radius?: number;
      intensity?: number;
    };
    if (typeof radius !== "number" || !Number.isInteger(radius) || radius < 0) {
      return this.createErrorResult("Radius must be a non-negative integer.");
    }
    if (typeof intensity !== "number") {
      return this.createErrorResult("Intensity must be a number.");
    }
    return executePhotonOperation(this, image, (img) => {
      oil(img, radius, intensity);
      return img.get_bytes();
    });
  }
}
