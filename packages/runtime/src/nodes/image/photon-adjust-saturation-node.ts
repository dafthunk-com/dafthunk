import { saturate_hsl } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node adjusts the saturation of an input image using the HSL color space via Photon library.
 */
export class PhotonAdjustSaturationNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    level: z
      .number({
        error: "Saturation level must be a number between 0.0 and 1.0.",
      })
      .min(0, {
        error: "Saturation level must be a number between 0.0 and 1.0.",
      })
      .max(1, {
        error: "Saturation level must be a number between 0.0 and 1.0.",
      }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-adjust-saturation",
    name: "Adjust Saturation (HSL)",
    type: "photon-adjust-saturation",
    description:
      "Adjusts image saturation using HSL. Level from 0.0 (no change) to 1.0 (max saturation increase).",
    tags: ["Image", "Photon", "Adjust", "Saturation"],
    icon: "thermometer",
    documentation:
      "This node adjusts image saturation using HSL. Level from 0.0 (no change) to 1.0 (max saturation increase).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to adjust saturation.",
        required: true,
      },
      {
        name: "level",
        type: "number",
        description:
          "Saturation level (0.0 to 1.0). 0.0 means no change, 0.1 is a 10% increase.",
        required: true,
        value: 0.1,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The saturation-adjusted image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonAdjustSaturationNode.inputSchema.safeParse(
      context.inputs
    );
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, level } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      saturate_hsl(img, level);
      return img.get_bytes();
    });
  }
}
