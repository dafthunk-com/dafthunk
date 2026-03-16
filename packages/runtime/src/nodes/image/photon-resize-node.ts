import { resize, SamplingFilter } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node resizes an input image to a specified width and height using the Photon library.
 */
export class PhotonResizeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-resize",
    name: "Image Resize",
    type: "photon-resize",
    description:
      "Resizes an image to the specified width and height using Photon.",
    tags: ["Image", "Photon", "Transform", "Resize"],
    icon: "scaling",
    documentation:
      "This node resizes an image to the specified width and height using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to resize.",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "Target width in pixels for the resized image.",
        required: true,
        value: 640,
      },
      {
        name: "height",
        type: "number",
        description: "Target height in pixels for the resized image.",
        required: true,
        value: 480,
      },
      {
        name: "samplingFilter",
        type: "string",
        description: "The sampling filter to use for resizing.",
        value: "Nearest", // "Nearest", "Triangle", "CatmullRom", "Gaussian", "Lanczos3"
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The resized image (WebP format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, width, height } = context.inputs as {
      image?: ImageParameter;
      width?: number;
      height?: number;
      samplingFilter?: keyof typeof SamplingFilter;
    };
    const filterName =
      (context.inputs as { samplingFilter?: keyof typeof SamplingFilter })
        .samplingFilter || "Nearest";

    if (typeof width !== "number" || width <= 0) {
      return this.createErrorResult("Width must be a positive number.");
    }
    if (typeof height !== "number" || height <= 0) {
      return this.createErrorResult("Height must be a positive number.");
    }

    const selectedFilter: SamplingFilter =
      SamplingFilter[filterName] !== undefined
        ? SamplingFilter[filterName]
        : SamplingFilter.Nearest;

    return executePhotonOperation(this, image, (img) => {
      const result = resize(img, width, height, selectedFilter);
      const bytes = result.get_bytes();
      result.free();
      return bytes;
    });
  }
}
