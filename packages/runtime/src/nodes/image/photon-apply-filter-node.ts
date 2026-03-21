import { filter } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node applies a named preset filter to an input image using the Photon library.
 */
export class PhotonApplyFilterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-apply-filter",
    name: "Apply Filter by Name",
    type: "photon-apply-filter",
    description:
      "Applies a named preset filter to an image (e.g., 'vintage', 'oceanic', 'lofi').",
    tags: ["Image", "Photon", "Filter"],
    icon: "list-filter",
    documentation:
      "This node applies a named preset filter to an image (e.g., 'vintage', 'oceanic', 'lofi').",
    inlinable: true,
    usage: 10,
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
    const { image, filterName } = context.inputs as {
      image?: ImageParameter;
      filterName?: string;
    };
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
    return executePhotonOperation(this, image, (img) => {
      filter(img, filterName);
      return img.get_bytes();
    });
  }
}
