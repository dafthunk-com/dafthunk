import { resize, SamplingFilter } from "@cf-wasm/photon";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
import { executePhotonOperation } from "./execute-photon-operation";
import { imageInputSchema } from "./image-input-schema";

/**
 * This node resizes an input image to a specified width and height using the Photon library.
 */
export class PhotonResizeNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    image: imageInputSchema(),
    width: z
      .number({ error: "Width must be a positive number." })
      .positive({ error: "Width must be a positive number." }),
    height: z
      .number({ error: "Height must be a positive number." })
      .positive({ error: "Height must be a positive number." }),
    // Unknown or missing filters fall back to Nearest, as before
    samplingFilter: z
      .enum(["Nearest", "Triangle", "CatmullRom", "Gaussian", "Lanczos3"])
      .catch("Nearest"),
  });

  public static readonly nodeType: NodeType = {
    id: "photon-resize",
    name: "Image Resize",
    type: "photon-resize",
    description:
      "Resizes an image to the specified width and height using Photon.",
    tags: ["Image", "Photon", "Transform", "Resize"],
    icon: "scaling",
    documentation:
      "This node resizes an image to the specified width and height using Photon.",
    inlinable: true,
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to resize.",
        required: true,
      },
      {
        name: "width",
        type: "number",
        description: "Target width in pixels for the resized image.",
        required: true,
        value: 640,
      },
      {
        name: "height",
        type: "number",
        description: "Target height in pixels for the resized image.",
        required: true,
        value: 480,
      },
      {
        name: "samplingFilter",
        type: "string",
        description: "The sampling filter to use for resizing.",
        value: "Nearest", // "Nearest", "Triangle", "CatmullRom", "Gaussian", "Lanczos3"
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The resized image (WebP format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const parsed = PhotonResizeNode.inputSchema.safeParse(context.inputs);
    if (!parsed.success) {
      return this.createErrorResult(zodErrorMessage(parsed.error));
    }
    const { image, width, height, samplingFilter } = parsed.data;

    const selectedFilter: SamplingFilter = SamplingFilter[samplingFilter];

    return executePhotonOperation(this, image, (img) => {
      const result = resize(img, width, height, selectedFilter);
      const bytes = result.get_bytes();
      result.free();
      return bytes;
    });
  }
}
