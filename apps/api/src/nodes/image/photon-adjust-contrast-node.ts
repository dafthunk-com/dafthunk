import { adjust_contrast, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node adjusts the contrast of an input image using the Photon library.
 */
export class PhotonAdjustContrastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-contrast",
    name: "Adjust Contrast",
    type: "photon-adjust-contrast",
    description:
      "Adjusts image contrast. Values typically range from -100 to 100.",
    tags: ["Image"],
    icon: "contrast",
    documentation: `This node adjusts image contrast. Values typically range from -100 to 100.

## Usage Example

- **Input**: 
\`\`\`
{
  "image": [image data],
  "amount": 30
}
\`\`\`
- **Output**: \`[contrast-adjusted image data in PNG format]\``,
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust.",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description:
          "Contrast adjustment factor (e.g., -100 to 100). Photon clamps between -255.0 and 255.0.",
        required: true,
        value: 0, // Default to no change
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The contrast-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      amount?: number;
    };

    const { image, amount } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof amount !== "number") {
      return this.createErrorResult("Contrast amount must be a number.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Adjust contrast
      adjust_contrast(photonImage, amount);

      // Get the adjusted image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon contrast adjustment resulted in empty image data."
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
          : "Unknown error during Photon image contrast adjustment.";
      console.error(`[PhotonAdjustContrastNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
