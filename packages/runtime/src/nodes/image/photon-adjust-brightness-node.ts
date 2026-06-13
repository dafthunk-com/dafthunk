import { adjust_brightness } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node adjusts the brightness of an input image using the Photon library.
 */
export class PhotonAdjustBrightnessNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    amount: z.number({ error: "Brightness amount must be a number." }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-adjust-brightness",
    name: "Adjust Brightness",
    type: "photon-adjust-brightness",
    description:
      "Adjusts image brightness. Positive values increase, negative values decrease.",
    tags: ["Image", "Photon", "Adjust", "Brightness"],
    icon: "sun",
    documentation:
      "This node adjusts image brightness. Positive values increase, negative values decrease.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust.",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description:
          "Brightness adjustment amount (e.g., -100 to 100). Positive increases, negative decreases.",
        required: true,
        value: 0, // Default to no change
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The brightness-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonAdjustBrightnessNode.inputSchema.safeParse(
      context.inputs
    );
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, amount } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      adjust_brightness(img, amount);
      return img.get_bytes();
    });
  }
}
