import { darken_hsl, lighten_hsl, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node adjusts the lightness of an input image using the HSL color space via Photon library.
 */
export class PhotonAdjustHslLightnessNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-hsl-lightness",
    name: "Photon Adjust Lightness (HSL)",
    type: "photon-adjust-hsl-lightness",
    description:
      "Adjusts image lightness using HSL. Amount from -1.0 (max darken) to 1.0 (max lighten).",
    tags: ["Image"],
    icon: "sun", // Using 'sun' as it relates to light, could also use 'moon' or a slider icon
    inlinable: true,
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
    const inputs = context.inputs as {
      image?: ImageParameter;
      amount?: number;
    };

    const { image, amount } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof amount !== "number" || amount < -1.0 || amount > 1.0) {
      return this.createErrorResult(
        "Lightness amount must be a number between -1.0 and 1.0."
      );
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Adjust lightness using HSL
      if (amount > 0) {
        lighten_hsl(photonImage, amount);
      } else if (amount < 0) {
        darken_hsl(photonImage, Math.abs(amount)); // darken_hsl expects a positive level
      }
      // If amount is 0, no change is needed

      // Get the adjusted image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon HSL lightness adjustment resulted in empty image data."
        );
      }

      const adjustedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: adjustedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image HSL lightness adjustment.";
      console.error(
        `[PhotonAdjustHslLightnessNode] Error: ${errorMessage}`,
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
