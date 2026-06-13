import { grayscale, threshold } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node applies a threshold to an image, converting it to black and white,
 * based on a specified threshold value using the Photon library.
 */
export class PhotonThresholdNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    thresholdValue: z
      .number({ error: "Threshold value must be a number between 0 and 255." })
      .min(0, {
        error: "Threshold value must be a number between 0 and 255.",
      })
      .max(255, {
        error: "Threshold value must be a number between 0 and 255.",
      }),
    convertToGrayscaleFirst: z.boolean().optional(),
  });

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
    const parsed = PhotonThresholdNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, thresholdValue, convertToGrayscaleFirst } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      if (convertToGrayscaleFirst !== false) {
        grayscale(img);
      }
      threshold(img, thresholdValue);
      return img.get_bytes();
    });
  }
}
