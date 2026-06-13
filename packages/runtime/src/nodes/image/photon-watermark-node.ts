import { watermark } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonDualImageOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node adds a watermark to an input image at specified coordinates using the Photon library.
 */
export class PhotonWatermarkNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    mainImage: imageInputSchema("Main image is missing or invalid."),
    watermarkImage: imageInputSchema("Watermark image is missing or invalid."),
    x: z.number({ error: "X coordinate must be a number." }),
    y: z.number({ error: "Y coordinate must be a number." }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-watermark",
    name: "Watermark Image",
    type: "photon-watermark",
    description:
      "Adds a watermark image onto a main image at specified x, y coordinates.",
    tags: ["Image", "Photon", "Effect", "Watermark"],
    icon: "award",
    documentation:
      "This node adds a watermark image onto a main image at specified x, y coordinates.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "mainImage",
        type: "image",
        description: "The main image to add the watermark to.",
        required: true,
      },
      {
        name: "watermarkImage",
        type: "image",
        description: "The watermark image to overlay.",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description:
          "The x-coordinate for the top-left corner of the watermark.",
        required: true,
        value: 0,
      },
      {
        name: "y",
        type: "number",
        description:
          "The y-coordinate for the top-left corner of the watermark.",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The image with the watermark applied (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonWatermarkNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { mainImage, watermarkImage, x, y } = parsed.data;
    return executePhotonDualImageOperation(
      this,
      mainImage,
      watermarkImage,
      "Main image",
      "Watermark image",
      (a, b) => {
        watermark(a, b, BigInt(x), BigInt(y));
        return a.get_bytes();
      }
    );
  }
}
