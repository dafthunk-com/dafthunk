import { darken_hsl, lighten_hsl } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node adjusts the lightness of an input image using the HSL color space via Photon library.
 */
export class PhotonAdjustHslLightnessNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-hsl-lightness",
    name: "Adjust Lightness (HSL)",
    type: "photon-adjust-hsl-lightness",
    description:
      "Adjusts image lightness using HSL. Amount from -1.0 (max darken) to 1.0 (max lighten).",
    tags: ["Image", "Photon", "Adjust", "Lightness"],
    icon: "sun",
    documentation:
      "This node adjusts image lightness using HSL. Amount from -1.0 (max darken) to 1.0 (max lighten).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust HSL lightness.",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description:
          "Lightness adjustment amount (-1.0 to 1.0). Positive lightens, negative darkens.",
        required: true,
        value: 0.0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The HSL lightness-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, amount } = context.inputs as {
      image?: ImageParameter;
      amount?: number;
    };
    if (typeof amount !== "number" || amount < -1.0 || amount > 1.0) {
      return this.createErrorResult(
        "Lightness amount must be a number between -1.0 and 1.0."
      );
    }
    return executePhotonOperation(this, image, (img) => {
      if (amount > 0) {
        lighten_hsl(img, amount);
      } else if (amount < 0) {
        darken_hsl(img, Math.abs(amount));
      }
      return img.get_bytes();
    });
  }
}
