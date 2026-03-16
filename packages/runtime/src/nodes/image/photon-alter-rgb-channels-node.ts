import { alter_channels } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node alters the Red, Green, and Blue channels of an input image by specified amounts using the Photon library.
 */
export class PhotonAlterRGBChannelsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-alter-rgb-channels",
    name: "Alter RGB Channels",
    type: "photon-alter-rgb-channels",
    description:
      "Adjusts the Red, Green, and Blue channels of an image by adding specified amounts (positive or negative).",
    tags: ["Image", "Photon", "Adjust", "RGB"],
    icon: "sliders-horizontal",
    documentation:
      "This node adjusts the Red, Green, and Blue channels of an image by adding specified amounts (positive or negative).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to alter channels.",
        required: true,
      },
      {
        name: "redAmount",
        type: "number",
        description:
          "Amount to add to the Red channel (e.g., -255 to 255). Photon clamps values.",
        required: true,
        value: 0,
      },
      {
        name: "greenAmount",
        type: "number",
        description:
          "Amount to add to the Green channel (e.g., -255 to 255). Photon clamps values.",
        required: true,
        value: 0,
      },
      {
        name: "blueAmount",
        type: "number",
        description:
          "Amount to add to the Blue channel (e.g., -255 to 255). Photon clamps values.",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image with altered RGB channels (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, redAmount, greenAmount, blueAmount } = context.inputs as {
      image?: ImageParameter;
      redAmount?: number;
      greenAmount?: number;
      blueAmount?: number;
    };
    if (typeof redAmount !== "number") {
      return this.createErrorResult("Red amount must be a number.");
    }
    if (typeof greenAmount !== "number") {
      return this.createErrorResult("Green amount must be a number.");
    }
    if (typeof blueAmount !== "number") {
      return this.createErrorResult("Blue amount must be a number.");
    }
    return executePhotonOperation(this, image, (img) => {
      alter_channels(img, redAmount, greenAmount, blueAmount);
      return img.get_bytes();
    });
  }
}
