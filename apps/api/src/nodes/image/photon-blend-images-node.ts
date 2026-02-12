import { blend, PhotonImage } from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import {
  ExecutableNode,
  ImageParameter,
  NodeContext,
} from "@dafthunk/runtime";

/**
 * This node blends two images together using a specified blend mode via the Photon library.
 */
export class PhotonBlendImagesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-blend-images",
    name: "Blend Images",
    type: "photon-blend-images",
    description:
      "Blends two images using a specified blend mode (e.g., 'overlay', 'multiply', 'screen', 'lighten', 'darken').",
    tags: ["Image", "Photon", "Blend"],
    icon: "layers",
    documentation:
      "This node blends two images using a specified blend mode (e.g., 'overlay', 'multiply', 'screen', 'lighten', 'darken').",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "baseImage",
        type: "image",
        description: "The base image.",
        required: true,
      },
      {
        name: "blendImage",
        type: "image",
        description: "The image to blend onto the base image.",
        required: true,
      },
      {
        name: "blendMode",
        type: "string",
        description:
          "The blend mode to use (e.g., 'overlay', 'multiply', 'screen'). Photon supports various modes like: 'overlay', 'over', 'atop', 'xor', 'plus', 'multiply', 'burn', 'darken', 'lighten', 'screen', 'dodge', 'exclusion', 'soft_light', 'hard_light'.",
        required: true,
        value: "overlay",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The blended image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      baseImage?: ImageParameter;
      blendImage?: ImageParameter;
      blendMode?: string;
    };

    const { baseImage, blendImage, blendMode } = inputs;

    if (!baseImage || !baseImage.data || !baseImage.mimeType) {
      return this.createErrorResult("Base image is missing or invalid.");
    }
    if (!blendImage || !blendImage.data || !blendImage.mimeType) {
      return this.createErrorResult("Blend image is missing or invalid.");
    }
    if (typeof blendMode !== "string" || blendMode.trim() === "") {
      return this.createErrorResult("Blend mode must be a non-empty string.");
    }

    let photonBaseImage: PhotonImage | undefined;
    let photonBlendImage: PhotonImage | undefined;

    try {
      // Create PhotonImage instances from the input bytes
      photonBaseImage = PhotonImage.new_from_byteslice(baseImage.data);
      photonBlendImage = PhotonImage.new_from_byteslice(blendImage.data);

      // Blend images
      // Photon's blend function modifies photonBaseImage in place.
      blend(photonBaseImage, photonBlendImage, blendMode);

      // Get the resulting image bytes in PNG format
      const outputBytes = photonBaseImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          "Photon blend operation resulted in empty image data."
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
          : "Unknown error during Photon image blending.";
      // It's possible Photon throws an error for an invalid blend mode string.
      // The error message from Photon might be generic, so we add context.
      console.error(
        `[PhotonBlendImagesNode] Error blending images with mode '${blendMode}': ${errorMessage}`,
        error
      );
      return this.createErrorResult(
        `Error blending images (mode: ${blendMode}): ${errorMessage}`
      );
    } finally {
      if (photonBaseImage) {
        photonBaseImage.free();
      }
      if (photonBlendImage) {
        photonBlendImage.free();
      }
    }
  }
}
