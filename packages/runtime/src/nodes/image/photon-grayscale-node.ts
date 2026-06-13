import { grayscale_human_corrected } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node converts an input image to grayscale using the Photon library (human-corrected algorithm).
 */
export class PhotonGrayscaleNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-grayscale",
    name: "Grayscale",
    type: "photon-grayscale",
    description:
      "Converts an image to grayscale using Photon (human-corrected algorithm).",
    tags: ["Image", "Photon", "Effect", "Grayscale"],
    icon: "droplet",
    documentation:
      "This node converts an image to grayscale using Photon (human-corrected algorithm).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to convert to grayscale.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The grayscale image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonGrayscaleNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    return executePhotonOperation(this, parsed.data.image, (img) => {
      grayscale_human_corrected(img);
      return img.get_bytes();
    });
  }
}
