import { adjust_brightness, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node adjusts the brightness of an input image using the Photon library.
 */
export class PhotonAdjustBrightnessNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-adjust-brightness",
    name: "Adjust Brightness",
    type: "photon-adjust-brightness",
    description:
      "Adjusts image brightness. Positive values increase, negative values decrease.",
    tags: ["Image"],
    icon: "sun",
    documentation: `This node adjusts image brightness. Positive values increase, negative values decrease.

## Usage Example

- **Input**: 
\`\`\`
{
  "image": [image data],
  "amount": 50
}
\`\`\`
- **Output**: \`[brightness-adjusted image data in PNG format]\``,
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
          "Brightness adjustment amount (e.g., -100 to 100). Positive increases, negative decreases.",
        required: true,
        value: 0, // Default to no change
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The brightness-adjusted image (PNG format).",
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
      return this.createErrorResult("Brightness amount must be a number.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Adjust brightness
      adjust_brightness(photonImage, amount);

      // Get the adjusted image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon brightness adjustment resulted in empty image data."
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
          : "Unknown error during Photon image brightness adjustment.";
      console.error(
        `[PhotonAdjustBrightnessNode] Error: ${errorMessage}`,
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
