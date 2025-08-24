import { invert, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node inverts the colors of an input image using the Photon library.
 */
export class PhotonInvertColorsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-invert-colors",
    name: "Invert Colors",
    type: "photon-invert-colors",
    description: "Inverts the colors of an image using Photon.",
    tags: ["Image"],
    icon: "aperture",
    documentation: `This node inverts the colors of an image using Photon.

## Usage Example

- **Input**: 
\`\`\`
{
  "image": [image data]
}
\`\`\`
- **Output**: \`[color-inverted image data in PNG format]\``,
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to invert.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The color-inverted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
    };

    const { image } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Invert the image colors
      invert(photonImage);

      // Get the inverted image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon color inversion resulted in empty image data."
        );
      }

      const invertedImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: invertedImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during Photon image color inversion.";
      console.error(`[PhotonInvertColorsNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
