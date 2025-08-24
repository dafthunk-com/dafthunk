import { PhotonImage, watermark } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node adds a watermark to an input image at specified coordinates using the Photon library.
 */
export class PhotonWatermarkNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-watermark",
    name: "Watermark Image",
    type: "photon-watermark",
    description:
      "Adds a watermark image onto a main image at specified x, y coordinates.",
    tags: ["Image"],
    icon: "award",
    documentation: "*Missing detailed documentation*", // Icon suggesting placing something on top or a badge
    inlinable: true,
    inputs: [
      {
        name: "mainImage",
        type: "image",
        description: "The main image to add the watermark to.",
        required: true,
      },
      {
        name: "watermarkImage",
        type: "image",
        description: "The watermark image to overlay.",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description:
          "The x-coordinate for the top-left corner of the watermark.",
        required: true,
        value: 0,
      },
      {
        name: "y",
        type: "number",
        description:
          "The y-coordinate for the top-left corner of the watermark.",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image with the watermark applied (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      mainImage?: ImageParameter;
      watermarkImage?: ImageParameter;
      x?: number;
      y?: number;
    };

    const { mainImage, watermarkImage, x, y } = inputs;

    if (!mainImage || !mainImage.data || !mainImage.mimeType) {
      return this.createErrorResult("Main image is missing or invalid.");
    }
    if (!watermarkImage || !watermarkImage.data || !watermarkImage.mimeType) {
      return this.createErrorResult("Watermark image is missing or invalid.");
    }
    if (typeof x !== "number") {
      return this.createErrorResult("X coordinate must be a number.");
    }
    if (typeof y !== "number") {
      return this.createErrorResult("Y coordinate must be a number.");
    }

    let mainPhotonImage: PhotonImage | undefined;
    let watermarkPhotonImage: PhotonImage | undefined;

    try {
      // Create PhotonImage instances from the input bytes
      mainPhotonImage = PhotonImage.new_from_byteslice(mainImage.data);
      watermarkPhotonImage = PhotonImage.new_from_byteslice(
        watermarkImage.data
      );

      // Add watermark
      // Photon's watermark function modifies mainPhotonImage in place.
      // Coordinates need to be BigInt for Photon
      watermark(mainPhotonImage, watermarkPhotonImage, BigInt(x), BigInt(y));

      // Get the resulting image bytes in PNG format
      const outputBytes = mainPhotonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon watermark operation resulted in empty image data."
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
          : "Unknown error during Photon image watermarking.";
      console.error(`[PhotonWatermarkNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (mainPhotonImage) {
        mainPhotonImage.free();
      }
      if (watermarkPhotonImage) {
        watermarkPhotonImage.free();
      }
    }
  }
}
