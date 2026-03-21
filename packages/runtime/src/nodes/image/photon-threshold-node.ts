import { grayscale, threshold } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

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
    const { image, thresholdValue, convertToGrayscaleFirst } =
      context.inputs as {
        image?: ImageParameter;
        thresholdValue?: number;
        convertToGrayscaleFirst?: boolean;
      };
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
    return executePhotonOperation(this, image, (img) => {
      if (convertToGrayscaleFirst !== false) {
        grayscale(img);
      }
      threshold(img, thresholdValue);
      return img.get_bytes();
    });
  }
}
