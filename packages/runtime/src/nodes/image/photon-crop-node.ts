import { crop } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node crops an input image to a specified rectangle using the Photon library.
 */
export class PhotonCropNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    x: z
      .number({ error: "x must be a non-negative number." })
      .min(0, { error: "x must be a non-negative number." }),
    y: z
      .number({ error: "y must be a non-negative number." })
      .min(0, { error: "y must be a non-negative number." }),
    width: z
      .number({ error: "Width must be a positive number." })
      .positive({ error: "Width must be a positive number." }),
    height: z
      .number({ error: "Height must be a positive number." })
      .positive({ error: "Height must be a positive number." }),
  });

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
    const parsed = PhotonCropNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, x, y, width, height } = parsed.data;
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
