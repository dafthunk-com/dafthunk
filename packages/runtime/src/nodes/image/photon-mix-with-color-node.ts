import { mix_with_colour, Rgb } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node mixes an input image with a specified solid color using a given opacity, via the Photon library.
 */
export class PhotonMixWithColorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-mix-with-color",
    name: "Mix With Color",
    type: "photon-mix-with-color",
    description:
      "Blends the image with a solid RGB color using a specified opacity (0.0 to 1.0).",
    tags: ["Image", "Photon", "Effect", "MixColor"],
    icon: "droplet",
    documentation:
      "This node blends the image with a solid RGB color using a specified opacity (0.0 to 1.0).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to mix with color.",
        required: true,
      },
      {
        name: "mixRed",
        type: "number",
        description: "Red component of the mix color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "mixGreen",
        type: "number",
        description: "Green component of the mix color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "mixBlue",
        type: "number",
        description: "Blue component of the mix color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "opacity",
        type: "number",
        description:
          "Opacity of the mix color (0.0 for no mix, 1.0 for full color).",
        required: true,
        value: 0.5,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image mixed with the specified color (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, mixRed, mixGreen, mixBlue, opacity } = context.inputs as {
      image?: ImageParameter;
      mixRed?: number;
      mixGreen?: number;
      mixBlue?: number;
      opacity?: number;
    };
    if (typeof mixRed !== "number" || mixRed < 0 || mixRed > 255) {
      return this.createErrorResult(
        "Mix Red component must be a number between 0 and 255."
      );
    }
    if (typeof mixGreen !== "number" || mixGreen < 0 || mixGreen > 255) {
      return this.createErrorResult(
        "Mix Green component must be a number between 0 and 255."
      );
    }
    if (typeof mixBlue !== "number" || mixBlue < 0 || mixBlue > 255) {
      return this.createErrorResult(
        "Mix Blue component must be a number between 0 and 255."
      );
    }
    if (typeof opacity !== "number" || opacity < 0.0 || opacity > 1.0) {
      return this.createErrorResult(
        "Opacity must be a number between 0.0 and 1.0."
      );
    }
    return executePhotonOperation(this, image, (img) => {
      const mixColorRgb = new Rgb(mixRed, mixGreen, mixBlue);
      mix_with_colour(img, mixColorRgb, opacity);
      return img.get_bytes();
    });
  }
}
