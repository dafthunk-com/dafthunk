import { grayscale_human_corrected, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node converts an input image to grayscale using the Photon library (human-corrected algorithm).
 */
export class PhotonGrayscaleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-grayscale",
    name: "Grayscale",
    type: "photon-grayscale",
    description:
      "Converts an image to grayscale using Photon (human-corrected algorithm).",
    tags: ["Image", "Photon", "Effect", "Grayscale"],
    icon: "droplet",
    documentation:
      "This node converts an image to grayscale using Photon (human-corrected algorithm).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to convert to grayscale.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The grayscale image (PNG format).",
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

      // Convert the image to grayscale
      grayscale_human_corrected(photonImage);

      // Get the grayscale image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon grayscale conversion resulted in empty image data."
        );
      }

      const grayscaleImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: grayscaleImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image grayscale conversion.";
      console.error(`[PhotonGrayscaleNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
