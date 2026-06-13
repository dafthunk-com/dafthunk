import { filter } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node applies a named preset filter to an input image using the Photon library.
 */
export class PhotonApplyFilterNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    filterName: z
      .string({ error: "Filter name must be a non-empty string." })
      .refine((value) => value.trim() !== "", {
        error: "Filter name must be a non-empty string.",
      }),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-apply-filter",
    name: "Apply Filter by Name",
    type: "photon-apply-filter",
    description:
      "Applies a named preset filter to an image (e.g., 'vintage', 'oceanic', 'lofi').",
    tags: ["Image", "Photon", "Filter"],
    icon: "list-filter",
    documentation:
      "This node applies a named preset filter to an image (e.g., 'vintage', 'oceanic', 'lofi').",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply the filter to.",
        required: true,
      },
      {
        name: "filterName",
        type: "string",
        description:
          "Name of the Photon filter (e.g., 'oceanic', 'islands', 'marine', 'seagreen', 'flagblue', 'liquid', 'diamante', 'radio', 'twenties', 'rosetint', 'mauve', 'bluechrome', 'vintage', 'perfume', 'serenity', 'lofi', 'pastel_pink', 'golden', 'cali', 'dramatic', 'firenze', 'obsidian', 'neue', 'lix', 'ryo'). Case sensitive.",
        required: true,
        value: "vintage",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The filtered image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonApplyFilterNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, filterName } = parsed.data;
    return executePhotonOperation(this, image, (img) => {
      filter(img, filterName);
      return img.get_bytes();
    });
  }
}
