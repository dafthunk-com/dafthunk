import { crop } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node crops an input image to a specified rectangle using the Photon library.
 */
export class PhotonCropNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-crop",
    name: "Image Crop",
    type: "photon-crop",
    description: "Crops an image to the specified rectangle using Photon.",
    tags: ["Image", "Photon", "Transform", "Crop"],
    icon: "crop",
    documentation:
      "This node crops an image to the specified rectangle using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to crop.",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description:
          "The x-coordinate of the top-left corner of the crop area.",
        required: true,
        value: 0,
      },
      {
        name: "y",
        type: "number",
        description:
          "The y-coordinate of the top-left corner of the crop area.",
        required: true,
        value: 0,
      },
      {
        name: "width",
        type: "number",
        description: "The width of the crop area.",
        required: true,
        value: 100,
      },
      {
        name: "height",
        type: "number",
        description: "The height of the crop area.",
        required: true,
        value: 100,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The cropped image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, x, y, width, height } = context.inputs as {
      image?: ImageParameter;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };
    if (!image || !image.data || !image.mimeType) {
      return this.createErrorResult("Input image is missing or invalid.");
    }
    if (typeof x !== "number" || x < 0) {
      return this.createErrorResult("x must be a non-negative number.");
    }
    if (typeof y !== "number" || y < 0) {
      return this.createErrorResult("y must be a non-negative number.");
    }
    if (typeof width !== "number" || width <= 0) {
      return this.createErrorResult("Width must be a positive number.");
    }
    if (typeof height !== "number" || height <= 0) {
      return this.createErrorResult("Height must be a positive number.");
    }
    return executePhotonOperation(this, image, (img) => {
      if (x + width > img.get_width()) {
        throw new Error("Crop area (x + width) exceeds image width.");
      }
      if (y + height > img.get_height()) {
        throw new Error("Crop area (y + height) exceeds image height.");
      }
      const result = crop(img, x, y, x + width, y + height);
      const bytes = result.get_bytes();
      result.free();
      return bytes;
    });
  }
}
