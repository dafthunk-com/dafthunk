import { PhotonImage, rotate } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node rotates an input image by a specified angle using the Photon library.
 */
export class PhotonRotateImageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-rotate-image",
    name: "Rotate Image",
    type: "photon-rotate-image",
    description:
      "Rotates an image by a specified angle (in degrees) using Photon.",
    tags: ["Image", "Photon", "Transform", "Rotate"],
    icon: "rotate-cw",
    documentation:
      "This node rotates an image by a specified angle (in degrees) using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to rotate.",
        required: true,
      },
      {
        name: "angle",
        type: "number",
        description: "Rotation angle in degrees (e.g., 90, -45, 180).",
        required: true,
        value: 0, // Default to no rotation
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The rotated image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      angle?: number;
    };

    const { image, angle } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof angle !== "number") {
      return this.createErrorResult("Rotation angle must be a number.");
    }

    let inputPhotonImage: PhotonImage | undefined;
    let outputPhotonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      inputPhotonImage = PhotonImage.new_from_byteslice(image.data);

      // Rotate the image
      // The rotate function returns a new PhotonImage
      outputPhotonImage = rotate(inputPhotonImage, angle);

      // Get the rotated image bytes in PNG format
      const outputBytes = outputPhotonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon rotate operation resulted in empty image data."
        );
      }

      const rotatedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: rotatedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image rotation.";
      console.error(`[PhotonRotateImageNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (inputPhotonImage) {
        inputPhotonImage.free();
      }
      if (outputPhotonImage) {
        outputPhotonImage.free();
      }
    }
  }
}
