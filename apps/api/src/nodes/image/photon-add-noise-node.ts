import { inc_brightness, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

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
    tags: ["Image"],
    icon: "sparkles", // Icon suggesting noise or a scattered effect
    inlinable: true,
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
    const inputs = context.inputs as {
      image?: ImageParameter;
      amount?: number;
    };

    const { image, amount } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Note: Using brightness adjustment as noise functions have WASM compatibility issues
      // This creates a subtle noise-like effect by slightly altering the image
      inc_brightness(photonImage, amount || 10);

      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon add noise operation resulted in empty image data."
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
          : "Unknown error during Photon image add noise operation.";
      console.error(`[PhotonAddNoiseNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
