import {
  grayscale, // For more accurate thresholding, often done on grayscale
  PhotonImage,
  threshold,
} from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import {
  ExecutableNode,
  ImageParameter,
  NodeContext,
} from "@dafthunk/runtime";

/**
 * This node applies a threshold to an image, converting it to black and white,
 * based on a specified threshold value using the Photon library.
 */
export class PhotonThresholdNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-threshold",
    name: "Threshold",
    type: "photon-threshold",
    description:
      "Converts an image to black and white based on a threshold value (0-255). Often best applied to a grayscale image.",
    tags: ["Image", "Photon", "Effect", "Threshold"],
    icon: "aperture",
    documentation:
      "This node converts an image to black and white based on a threshold value (0-255). Often best applied to a grayscale image.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply thresholding.",
        required: true,
      },
      {
        name: "thresholdValue",
        type: "number",
        description:
          "Threshold value (0-255). Pixels above become white, others black.",
        required: true,
        value: 128, // Common default for thresholding
      },
      {
        name: "convertToGrayscaleFirst",
        type: "boolean",
        description:
          "Convert image to grayscale before thresholding for more predictable results.",
        required: false,
        value: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The thresholded (black and white) image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      thresholdValue?: number;
      convertToGrayscaleFirst?: boolean;
    };

    const { image, thresholdValue, convertToGrayscaleFirst } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (
      typeof thresholdValue !== "number" ||
      thresholdValue < 0 ||
      thresholdValue > 255
    ) {
      return this.createErrorResult(
        "Threshold value must be a number between 0 and 255."
      );
    }

    let photonImage: PhotonImage | undefined;

    try {
      photonImage = PhotonImage.new_from_byteslice(image.data);

      if (convertToGrayscaleFirst !== false) {
        // Defaults to true if undefined
        grayscale(photonImage); // Photon's threshold works on RGB, but often better on grayscale
      }

      // Photon's threshold function takes a u32, JS number is fine.
      threshold(photonImage, thresholdValue);

      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon threshold operation resulted in empty image data."
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
          : "Unknown error during Photon image thresholding.";
      console.error(`[PhotonThresholdNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
