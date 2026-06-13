import { mix_with_colour, Rgb } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node mixes an input image with a specified solid color using a given opacity, via the Photon library.
 */
export class PhotonMixWithColorNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    mixRed: z
      .number({
        error: "Mix Red component must be a number between 0 and 255.",
      })
      .min(0, {
        error: "Mix Red component must be a number between 0 and 255.",
      })
      .max(255, {
        error: "Mix Red component must be a number between 0 and 255.",
      }),
    mixGreen: z
      .number({
        error: "Mix Green component must be a number between 0 and 255.",
      })
      .min(0, {
        error: "Mix Green component must be a number between 0 and 255.",
      })
      .max(255, {
        error: "Mix Green component must be a number between 0 and 255.",
      }),
    mixBlue: z
      .number({
        error: "Mix Blue component must be a number between 0 and 255.",
      })
      .min(0, {
        error: "Mix Blue component must be a number between 0 and 255.",
      })
      .max(255, {
        error: "Mix Blue component must be a number between 0 and 255.",
      }),
    opacity: z
      .number({ error: "Opacity must be a number between 0.0 and 1.0." })
      .min(0, { error: "Opacity must be a number between 0.0 and 1.0." })
      .max(1, { error: "Opacity must be a number between 0.0 and 1.0." }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-mix-with-color",
    name: "Mix With Color",
    type: "photon-mix-with-color",
    description:
      "Blends the image with a solid RGB color using a specified opacity (0.0 to 1.0).",
    tags: ["Image", "Photon", "Effect", "MixColor"],
    icon: "droplet",
    documentation:
      "This node blends the image with a solid RGB color using a specified opacity (0.0 to 1.0).",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to mix with color.",
        required: true,
      },
      {
        name: "mixRed",
        type: "number",
        description: "Red component of the mix color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "mixGreen",
        type: "number",
        description: "Green component of the mix color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "mixBlue",
        type: "number",
        description: "Blue component of the mix color (0-255).",
        required: true,
        value: 0,
      },
      {
        name: "opacity",
        type: "number",
        description:
          "Opacity of the mix color (0.0 for no mix, 1.0 for full color).",
        required: true,
        value: 0.5,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image mixed with the specified color (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonMixWithColorNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, mixRed, mixGreen, mixBlue, opacity } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      const mixColorRgb = new Rgb(mixRed, mixGreen, mixBlue);
      mix_with_colour(img, mixColorRgb, opacity);
      return img.get_bytes();
    });
  }
}
