import { blend } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonDualImageOperation } from "./execute-photon-operation";

/**
 * This node blends two images together using a specified blend mode via the Photon library.
 */
export class PhotonBlendImagesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-blend-images",
    name: "Blend Images",
    type: "photon-blend-images",
    description:
      "Blends two images using a specified blend mode (e.g., 'overlay', 'multiply', 'screen', 'lighten', 'darken').",
    tags: ["Image", "Photon", "Blend"],
    icon: "layers",
    documentation:
      "This node blends two images using a specified blend mode (e.g., 'overlay', 'multiply', 'screen', 'lighten', 'darken').",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "baseImage",
        type: "image",
        description: "The base image.",
        required: true,
      },
      {
        name: "blendImage",
        type: "image",
        description: "The image to blend onto the base image.",
        required: true,
      },
      {
        name: "blendMode",
        type: "string",
        description:
          "The blend mode to use (e.g., 'overlay', 'multiply', 'screen'). Photon supports various modes like: 'overlay', 'over', 'atop', 'xor', 'plus', 'multiply', 'burn', 'darken', 'lighten', 'screen', 'dodge', 'exclusion', 'soft_light', 'hard_light'.",
        required: true,
        value: "overlay",
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The blended image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { baseImage, blendImage, blendMode } = context.inputs as {
      baseImage?: ImageParameter;
      blendImage?: ImageParameter;
      blendMode?: string;
    };
    if (!baseImage || !baseImage.data || !baseImage.mimeType) {
      return this.createErrorResult("Base image is missing or invalid.");
    }
    if (typeof blendMode !== "string" || blendMode.trim() === "") {
      return this.createErrorResult("Blend mode must be a non-empty string.");
    }
    return executePhotonDualImageOperation(
      this,
      baseImage,
      blendImage,
      "Base image",
      "Blend image",
      (a, b) => {
        blend(a, b, blendMode);
        return a.get_bytes();
      }
    );
  }
}
