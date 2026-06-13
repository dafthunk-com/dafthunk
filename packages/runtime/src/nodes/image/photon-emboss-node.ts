import { emboss } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node applies an emboss effect to an input image using the Photon library.
 */
export class PhotonEmbossNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-emboss",
    name: "Emboss Effect",
    type: "photon-emboss",
    description:
      "Applies an emboss effect to an image, giving it a carved or stamped appearance.",
    tags: ["Image", "Photon", "Effect", "Emboss"],
    icon: "trending-up",
    documentation:
      "This node applies an emboss effect to an image, giving it a carved or stamped appearance.",
    inlinable: true,
    usage: 10,
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
    const parsed = PhotonEmbossNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    return executePhotonOperation(this, parsed.data.image, (img) => {
      emboss(img);
      return img.get_bytes();
    });
  }
}
