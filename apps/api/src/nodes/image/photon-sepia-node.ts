import { PhotonImage, sepia } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node applies a sepia tone to an input image using the Photon library.
 */
export class PhotonSepiaNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-sepia",
    name: "Sepia Tone",
    type: "photon-sepia",
    description: "Applies a sepia tone to an image using Photon.",
    tags: ["Image"],
    icon: "coffee", // Placeholder icon, represents vintage/sepia
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply sepia tone to.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The sepia-toned image (PNG format).",
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

      // Apply sepia tone
      sepia(photonImage);

      // Get the sepia image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon sepia conversion resulted in empty image data."
        );
      }

      const sepiaImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: sepiaImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image sepia conversion.";
      console.error(`[PhotonSepiaNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
