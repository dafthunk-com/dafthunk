import { oil, PhotonImage } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * This node applies an oil painting effect to an input image using the Photon library.
 */
export class PhotonOilPaintingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-oil-painting",
    name: "Oil Painting Effect",
    type: "photon-oil-painting",
    description: "Applies an oil painting effect to an image using Photon.",
    tags: ["Image", "Photon", "Effect", "OilPainting"],
    icon: "palette",
    documentation:
      "This node applies an oil painting effect to an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply the oil painting effect to.",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description:
          "Radius of each paint particle (integer, e.g., 2-10). Photon default: 4.",
        required: true,
        value: 4,
      },
      {
        name: "intensity",
        type: "number",
        description:
          "Intensity of the effect (float, e.g., 20.0-100.0). Photon default: 55.0.",
        required: true,
        value: 55.0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The oil painting-style image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      radius?: number;
      intensity?: number;
    };

    const { image, radius, intensity } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof radius !== "number" || !Number.isInteger(radius) || radius < 0) {
      return this.createErrorResult("Radius must be a non-negative integer.");
    }
    if (typeof intensity !== "number") {
      return this.createErrorResult("Intensity must be a number.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Apply oil painting effect
      oil(photonImage, radius, intensity);

      // Get the resulting image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon oil painting effect resulted in empty image data."
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
          : "Unknown error during Photon image oil painting effect.";
      console.error(`[PhotonOilPaintingNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
