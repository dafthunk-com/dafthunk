import { inc_brightness } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node adds noise-like effects to an input image using the Photon library.
 * Note: Due to WASM compatibility issues with noise functions, this uses a brightness adjustment as a substitute.
 */
export class PhotonAddNoiseNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    amount: z.number().optional(),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-add-noise",
    name: "Add Noise",
    type: "photon-add-noise",
    description: "Adds randomized Gaussian noise to an image.",
    tags: ["Image", "Photon", "Effect", "Noise"],
    icon: "sparkles",
    documentation: "This node adds randomized Gaussian noise to an image.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to add noise to.",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description:
          "Amount of noise-like effect to add (brightness adjustment).",
        required: false,
        value: 10,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image with added noise (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonAddNoiseNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, amount } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      inc_brightness(img, amount || 10);
      return img.get_bytes();
    });
  }
}
