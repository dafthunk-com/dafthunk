import {
  filter, // Generic filter function
  PhotonImage,
} from "@cf-wasm/photon";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, ImageParameter, NodeContext } from "../types";

/**
 * This node applies a named preset filter to an input image using the Photon library.
 */
export class PhotonApplyFilterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-apply-filter",
    name: "Photon Apply Filter by Name",
    type: "photon-apply-filter",
    description:
      "Applies a named preset filter to an image (e.g., 'vintage', 'oceanic', 'lofi').",
    tags: ["Image"],
    icon: "filter",
    inlinable: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply the filter to.",
        required: true,
      },
      {
        name: "filterName",
        type: "string",
        description:
          "Name of the Photon filter (e.g., 'oceanic', 'islands', 'marine', 'seagreen', 'flagblue', 'liquid', 'diamante', 'radio', 'twenties', 'rosetint', 'mauve', 'bluechrome', 'vintage', 'perfume', 'serenity', 'lofi', 'pastel_pink', 'golden', 'cali', 'dramatic', 'firenze', 'obsidian', 'neue', 'lix', 'ryo'). Case sensitive.",
        required: true,
        value: "vintage",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The filtered image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const inputs = context.inputs as {
      image?: ImageParameter;
      filterName?: string;
    };

    const { image, filterName } = inputs;

    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (
      !filterName ||
      typeof filterName !== "string" ||
      filterName.trim() === ""
    ) {
      return this.createErrorResult("Filter name must be a non-empty string.");
    }

    let photonImage: PhotonImage | undefined;

    try {
      // Create a PhotonImage instance from the input bytes
      photonImage = PhotonImage.new_from_byteslice(image.data);

      // Apply the named filter
      // Note: Photon's `filter` function might throw an error for invalid filter names.
      // The try-catch block will handle this.
      filter(photonImage, filterName);

      // Get the filtered image bytes in PNG format
      const outputBytes = photonImage.get_bytes();

      if (!outputBytes || outputBytes.length === 0) {
        return this.createErrorResult(
          `Photon filter application ('${filterName}') resulted in empty image data.`
        );
      }

      const filteredImage: ImageParameter = {
        data: outputBytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({ image: filteredImage });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Unknown error during Photon filter ('${filterName}') application. Check if the filter name is valid.`;
      console.error(
        `[PhotonApplyFilterNode] Error applying filter '${filterName}': ${errorMessage}`,
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
