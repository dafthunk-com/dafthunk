import {
  type PhotonImage,
  padding_bottom,
  padding_left,
  padding_right,
  padding_top,
  Rgba,
} from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

const sideSchema = z
  .number({ error: "Padding must be a non-negative number." })
  .int({ error: "Padding must be a whole number of pixels." })
  .min(0, { error: "Padding must be a non-negative number." });

const channelSchema = z
  .number({ error: "Color components must be between 0 and 255." })
  .min(0, { error: "Color components must be between 0 and 255." })
  .max(255, { error: "Color components must be between 0 and 255." });

/**
 * This node extends an image's canvas by adding padding on any side using the
 * Photon library. The fill color defaults to transparent, so the original
 * image keeps its size while the canvas grows in the chosen direction(s).
 *
 * Example: a 200x100 image with `top = 100` becomes 200x200 with a transparent
 * 200x100 header on top and the original image as the footer.
 */
export class PhotonPadNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    top: sideSchema,
    bottom: sideSchema,
    left: sideSchema,
    right: sideSchema,
    fillRed: channelSchema,
    fillGreen: channelSchema,
    fillBlue: channelSchema,
    fillAlpha: channelSchema,
  });

  public static readonly nodeType: NodeType = {
    id: "photon-pad",
    name: "Image Pad",
    type: "photon-pad",
    description:
      "Extends an image's canvas by adding padding on any side, with a configurable fill color (transparent by default).",
    tags: ["Image", "Photon", "Transform", "Pad"],
    icon: "expand",
    documentation:
      "This node extends an image's canvas by adding padding to the top, bottom, left, and/or right. The original image keeps its dimensions while the canvas grows in the chosen direction. The fill color defaults to fully transparent (alpha 0); set the alpha to 255 for an opaque fill.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to pad.",
        required: true,
      },
      {
        name: "top",
        type: "number",
        description: "Pixels of padding to add above the image.",
        required: true,
        value: 0,
      },
      {
        name: "bottom",
        type: "number",
        description: "Pixels of padding to add below the image.",
        required: true,
        value: 0,
      },
      {
        name: "left",
        type: "number",
        description: "Pixels of padding to add to the left of the image.",
        required: true,
        value: 0,
      },
      {
        name: "right",
        type: "number",
        description: "Pixels of padding to add to the right of the image.",
        required: true,
        value: 0,
      },
      {
        name: "fillRed",
        type: "number",
        description: "Red component of the fill color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "fillGreen",
        type: "number",
        description: "Green component of the fill color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "fillBlue",
        type: "number",
        description: "Blue component of the fill color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "fillAlpha",
        type: "number",
        description:
          "Alpha of the fill color (0 for transparent, 255 for opaque).",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The padded image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonPadNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, top, bottom, left, right, ...fill } = parsed.data;

    if (top + bottom + left + right === 0) {
      return this.createErrorResult(
        "At least one of top, bottom, left, or right must be greater than zero."
      );
    }

    return executePhotonOperation(this, image, (img) => {
      // Each padding function returns a new PhotonImage and consumes its Rgba
      // argument (it is moved into Rust), so a fresh Rgba is built per side and
      // never freed manually. Intermediate images are freed here; the original
      // `img` is borrowed by Photon and freed by the helper.
      const intermediates: PhotonImage[] = [];
      let current = img;
      const pad = (
        fn: (i: PhotonImage, p: number, c: Rgba) => PhotonImage,
        amount: number
      ) => {
        if (amount <= 0) return;
        const rgba = new Rgba(
          fill.fillRed,
          fill.fillGreen,
          fill.fillBlue,
          fill.fillAlpha
        );
        current = fn(current, amount, rgba);
        intermediates.push(current);
      };

      try {
        pad(padding_top, top);
        pad(padding_bottom, bottom);
        pad(padding_left, left);
        pad(padding_right, right);
        return current.get_bytes();
      } finally {
        for (const padded of intermediates) padded.free();
      }
    });
  }
}
