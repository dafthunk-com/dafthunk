import { fliph, flipv } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node flips an input image horizontally or vertically using the Photon library.
 */
export class PhotonFlipImageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-flip-image",
    name: "Flip Image",
    type: "photon-flip-image",
    description: "Flips an image horizontally or vertically using Photon.",
    tags: ["Image", "Photon", "Transform", "Flip"],
    icon: "repeat",
    documentation:
      "This node flips an image horizontally or vertically using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to flip.",
        required: true,
      },
      {
        name: "direction",
        type: "string",
        description:
          "The direction to flip the image. Valid options: 'horizontal', 'vertical'.",
        required: true,
        value: "horizontal",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The flipped image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image, direction } = context.inputs as {
      image?: ImageParameter;
      direction?: "horizontal" | "vertical";
    };
    if (
      !direction ||
      (direction !== "horizontal" && direction !== "vertical")
    ) {
      return this.createErrorResult(
        "Invalid flip direction. Must be 'horizontal' or 'vertical'."
      );
    }
    return executePhotonOperation(this, image, (img) => {
      if (direction === "horizontal") {
        fliph(img);
      } else {
        flipv(img);
      }
      return img.get_bytes();
    });
  }
}
