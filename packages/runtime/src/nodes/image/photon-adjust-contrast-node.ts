import { adjust_contrast } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node adjusts the contrast of an input image using the Photon library.
 */
export class PhotonAdjustContrastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-contrast",
    name: "Adjust Contrast",
    type: "photon-adjust-contrast",
    description:
      "Adjusts image contrast. Values typically range from -100 to 100.",
    tags: ["Image", "Photon", "Adjust", "Contrast"],
    icon: "contrast",
    documentation:
      "This node adjusts image contrast. Values typically range from -100 to 100.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust.",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description:
          "Contrast adjustment factor (e.g., -100 to 100). Photon clamps between -255.0 and 255.0.",
        required: true,
        value: 0, // Default to no change
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The contrast-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, amount } = context.inputs as {
      image?: ImageParameter;
      amount?: number;
    };
    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof amount !== "number") {
      return this.createErrorResult("Contrast amount must be a number.");
    }
    return executePhotonOperation(this, image, (img) => {
      adjust_contrast(img, amount);
      return img.get_bytes();
    });
  }
}
