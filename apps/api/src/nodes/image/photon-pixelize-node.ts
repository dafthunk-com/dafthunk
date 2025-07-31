import { PhotonImage, pixelize } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node pixelizes an input image using the Photon library.
 */
export class PhotonPixelizeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-pixelize",
    name: "Pixelize Effect",
    type: "photon-pixelize",
    description: "Applies a pixelization effect to an image using Photon.",
    tags: ["Image"],
    icon: "grid-3x3", // Icon representing pixels or a grid
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to pixelize.",
        required: true,
      },
      {
        name: "pixelSize",
        type: "number",
        description:
          "Targeted pixel size for the generated blocks (positive integer, e.g., 5, 10, 20).",
        required: true,
        value: 10,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The pixelized image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      pixelSize?: number;
    };

    const { image, pixelSize } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (
      typeof pixelSize !== "number" ||
      !Number.isInteger(pixelSize) ||
      pixelSize <= 0
    ) {
      return this.createErrorResult("Pixel size must be a positive integer.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Apply pixelize effect
      pixelize(photonImage, pixelSize);

      // Get the resulting image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon pixelize effect resulted in empty image data."
        );
      }

      const effectedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: effectedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image pixelize effect.";
      console.error(`[PhotonPixelizeNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
