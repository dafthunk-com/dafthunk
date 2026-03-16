import { hue_rotate_hsl } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node adjusts the hue of an input image using the HSL color space via Photon library.
 */
export class PhotonAdjustHueNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-hue",
    name: "Adjust Hue (HSL)",
    type: "photon-adjust-hue",
    description:
      "Adjusts image hue using HSL. Degrees from 0 to 360 for hue rotation.",
    tags: ["Image", "Photon", "Adjust", "Hue"],
    icon: "rotate-3d",
    documentation:
      "This node adjusts image hue using HSL. Degrees from 0 to 360 for hue rotation.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust hue.",
        required: true,
      },
      {
        name: "degrees",
        type: "number",
        description: "Hue rotation angle in degrees (0 to 360).",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The hue-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, degrees } = context.inputs as {
      image?: ImageParameter;
      degrees?: number;
    };
    if (typeof degrees !== "number") {
      return this.createErrorResult("Hue rotation degrees must be a number.");
    }
    return executePhotonOperation(this, image, (img) => {
      hue_rotate_hsl(img, degrees);
      return img.get_bytes();
    });
  }
}
