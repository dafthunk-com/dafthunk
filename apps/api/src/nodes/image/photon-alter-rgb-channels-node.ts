import { alter_channels, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

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
    tags: ["Image"],
    icon: "sliders-horizontal",
    documentation:
      "This node adjusts the Red, Green, and Blue channels of an image by adding specified amounts (positive or negative).",
    inlinable: true,
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
    const inputs = context.inputs as {
      image?: ImageParameter;
      redAmount?: number;
      greenAmount?: number;
      blueAmount?: number;
    };

    const { image, redAmount, greenAmount, blueAmount } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof redAmount !== "number") {
      return this.createErrorResult("Red amount must be a number.");
    }
    if (typeof greenAmount !== "number") {
      return this.createErrorResult("Green amount must be a number.");
    }
    if (typeof blueAmount !== "number") {
      return this.createErrorResult("Blue amount must be a number.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Photon's alter_channels expects i16 for amounts, but JS numbers will work.
      // The library handles clamping internally.
      alter_channels(photonImage, redAmount, greenAmount, blueAmount);

      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon alter RGB channels operation resulted in empty image data."
        );
      }

      const resultImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: resultImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon RGB channel alteration.";
      console.error(
        `[PhotonAlterRGBChannelsNode] Error: ${errorMessage}`,
        error
      );
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
