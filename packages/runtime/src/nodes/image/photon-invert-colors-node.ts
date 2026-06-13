import { invert } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node inverts the colors of an input image using the Photon library.
 */
export class PhotonInvertColorsNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-invert-colors",
    name: "Invert Colors",
    type: "photon-invert-colors",
    description: "Inverts the colors of an image using Photon.",
    tags: ["Image", "Photon", "Effect", "Invert"],
    icon: "aperture",
    documentation: "This node inverts the colors of an image using Photon.",
    inlinable: true,
    usage: 10,
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
    const parsed = PhotonInvertColorsNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    return executePhotonOperation(this, parsed.data.image, (img) => {
      invert(img);
      return img.get_bytes();
    });
  }
}
