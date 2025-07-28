import { PhotonImage, sharpen } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node sharpens an input image using the Photon library.
 */
export class PhotonSharpenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-sharpen",
    name: "Photon Sharpen",
    type: "photon-sharpen",
    description: "Sharpens an image using Photon.",
    tags: ["Image"],
    icon: "trending-up", // Placeholder for a sharpen-specific icon
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to sharpen.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The sharpened image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
    };

    const { image } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Sharpen the image
      sharpen(photonImage);

      // Get the sharpened image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon sharpen operation resulted in empty image data."
        );
      }

      const sharpenedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: sharpenedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image sharpening.";
      console.error(`[PhotonSharpenNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
