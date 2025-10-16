import { fliph, flipv, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node flips an input image horizontally or vertically using the Photon library.
 */
export class PhotonFlipImageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-flip-image",
    name: "Flip Image",
    type: "photon-flip-image",
    description: "Flips an image horizontally or vertically using Photon.",
    tags: ["Image"],
    icon: "repeat",
    documentation:
      "This node flips an image horizontally or vertically using Photon.",
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to flip.",
        required: true,
      },
      {
        name: "direction",
        type: "string",
        description:
          "The direction to flip the image. Valid options: 'horizontal', 'vertical'.",
        required: true,
        value: "horizontal",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The flipped image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      direction?: "horizontal" | "vertical";
    };

    const { image, direction } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (
      !direction ||
      (direction !== "horizontal" && direction !== "vertical")
    ) {
      return this.createErrorResult(
        "Invalid flip direction. Must be 'horizontal' or 'vertical'."
      );
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Flip the image based on direction
      if (direction === "horizontal") {
        fliph(photonImage);
      } else {
        flipv(photonImage);
      }

      // Get the flipped image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon flip operation resulted in empty image data."
        );
      }

      const flippedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: flippedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image flip operation.";
      console.error(`[PhotonFlipImageNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
