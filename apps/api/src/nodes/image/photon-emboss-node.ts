import { emboss, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node applies an emboss effect to an input image using the Photon library.
 */
export class PhotonEmbossNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-emboss",
    name: "Photon Emboss Effect",
    type: "photon-emboss",
    description:
      "Applies an emboss effect to an image, giving it a carved or stamped appearance.",
    category: "Image",
    icon: "trending-up", // Icon that might suggest a raised/3D effect
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply the emboss effect to.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The embossed image (PNG format).",
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
      photonImage = PhotonImage.new_from_byteslice(image.data);

      emboss(photonImage);

      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon emboss effect resulted in empty image data."
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
          : "Unknown error during Photon image emboss effect.";
      console.error(`[PhotonEmbossNode] Error: ${errorMessage}`, error);
      return this.createErrorResult(errorMessage);
    } finally {
      if (photonImage) {
        photonImage.free();
      }
    }
  }
}
