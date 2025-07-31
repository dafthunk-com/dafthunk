import { gaussian_blur, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node applies Gaussian blur to an input image using the Photon library.
 */
export class PhotonGaussianBlurNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-gaussian-blur",
    name: "Gaussian Blur",
    type: "photon-gaussian-blur",
    description:
      "Applies Gaussian blur to an image. Higher radius means more blur.",
    tags: ["Image"],
    icon: "scan-eye", // Icon for blur effect
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to blur.",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description:
          "Blur radius (integer, e.g., 1, 2, 3). Higher values increase blur intensity.",
        required: true,
        value: 1, // Default to a minimal blur
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The blurred image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      radius?: number;
    };

    const { image, radius } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof radius !== "number" || radius < 0) {
      // Photon's gaussian_blur expects an i32, typically positive.
      // While Photon might handle negative/zero, good practice to ensure it's non-negative.
      return this.createErrorResult(
        "Blur radius must be a non-negative number."
      );
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Apply Gaussian blur
      gaussian_blur(photonImage, Math.round(radius)); // Ensure integer radius

      // Get the blurred image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon Gaussian blur resulted in empty image data."
        );
      }

      const blurredImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: blurredImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image Gaussian blur.";
      console.error(`[PhotonGaussianBlurNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
