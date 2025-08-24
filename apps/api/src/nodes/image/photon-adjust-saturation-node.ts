import { PhotonImage, saturate_hsl } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node adjusts the saturation of an input image using the HSL color space via Photon library.
 */
export class PhotonAdjustSaturationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-saturation",
    name: "Adjust Saturation (HSL)",
    type: "photon-adjust-saturation",
    description:
      "Adjusts image saturation using HSL. Level from 0.0 (no change) to 1.0 (max saturation increase).",
    tags: ["Image"],
    icon: "thermometer",
    documentation: "*Missing detailed documentation*", // Placeholder icon for saturation/color intensity
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust saturation.",
        required: true,
      },
      {
        name: "level",
        type: "number",
        description:
          "Saturation level (0.0 to 1.0). 0.0 means no change, 0.1 is a 10% increase.",
        required: true,
        value: 0.1,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The saturation-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      level?: number;
    };

    const { image, level } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof level !== "number" || level < 0 || level > 1.0) {
      return this.createErrorResult(
        "Saturation level must be a number between 0.0 and 1.0."
      );
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Adjust saturation using HSL
      saturate_hsl(photonImage, level);

      // Get the adjusted image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon saturation adjustment resulted in empty image data."
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
          : "Unknown error during Photon image saturation adjustment.";
      console.error(
        `[PhotonAdjustSaturationNode] Error: ${errorMessage}`,
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
