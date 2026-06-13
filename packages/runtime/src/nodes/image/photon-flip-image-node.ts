import { fliph, flipv } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node flips an input image horizontally or vertically using the Photon library.
 */
export class PhotonFlipImageNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    direction: z.enum(["horizontal", "vertical"], {
      error: "Invalid flip direction. Must be 'horizontal' or 'vertical'.",
    }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-flip-image",
    name: "Flip Image",
    type: "photon-flip-image",
    description: "Flips an image horizontally or vertically using Photon.",
    tags: ["Image", "Photon", "Transform", "Flip"],
    icon: "repeat",
    documentation:
      "This node flips an image horizontally or vertically using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to flip.",
        required: true,
      },
      {
        name: "direction",
        type: "string",
        description:
          "The direction to flip the image. Valid options: 'horizontal', 'vertical'.",
        required: true,
        value: "horizontal",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The flipped image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonFlipImageNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, direction } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      if (direction === "horizontal") {
        fliph(img);
      } else {
        flipv(img);
      }
      return img.get_bytes();
    });
  }
}
