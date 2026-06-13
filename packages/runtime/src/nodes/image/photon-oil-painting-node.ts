import { oil } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node applies an oil painting effect to an input image using the Photon library.
 */
export class PhotonOilPaintingNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    radius: z
      .number({ error: "Radius must be a non-negative integer." })
      .int({ error: "Radius must be a non-negative integer." })
      .min(0, { error: "Radius must be a non-negative integer." }),
    intensity: z.number({ error: "Intensity must be a number." }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-oil-painting",
    name: "Oil Painting Effect",
    type: "photon-oil-painting",
    description: "Applies an oil painting effect to an image using Photon.",
    tags: ["Image", "Photon", "Effect", "OilPainting"],
    icon: "palette",
    documentation:
      "This node applies an oil painting effect to an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply the oil painting effect to.",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description:
          "Radius of each paint particle (integer, e.g., 2-10). Photon default: 4.",
        required: true,
        value: 4,
      },
      {
        name: "intensity",
        type: "number",
        description:
          "Intensity of the effect (float, e.g., 20.0-100.0). Photon default: 55.0.",
        required: true,
        value: 55.0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The oil painting-style image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonOilPaintingNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, radius, intensity } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      oil(img, radius, intensity);
      return img.get_bytes();
    });
  }
}
